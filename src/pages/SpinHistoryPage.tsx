import React, { useState, useMemo } from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { SpinChip } from '../components/common/SpinChip';
import {
  History,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const SpinHistoryPage: React.FC = () => {
  const { spins, predictions, updateSpin, deleteSpin, clearSessionSpins, importSpinsBatch, showToast } =
    useRouletteStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  // Map predictions by snapshotId or spin index
  const predictionMap = useMemo(() => {
    const map = new Map<string, (typeof predictions)[0]>();
    predictions.forEach((p) => {
      if (p.resolvedSpinId) {
        map.set(p.resolvedSpinId, p);
      }
    });
    return map;
  }, [predictions]);

  const filteredSpins = useMemo(() => {
    return spins
      .filter((s) => s.number.includes(searchTerm) || s.source.includes(searchTerm.toLowerCase()))
      .reverse(); // newest top
  }, [spins, searchTerm]);

  const handleStartEdit = (id: string, num: string) => {
    setEditingId(id);
    setEditVal(num);
  };

  const handleSaveEdit = (id: string) => {
    if (!editVal) return;
    updateSpin(id, editVal);
    setEditingId(null);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(spins, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roulette_spins_session_${Date.now()}.json`;
    a.click();
    showToast('Exported spin history JSON', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const numbers = parsed.map((item) => (typeof item === 'string' ? item : item.number)).filter(Boolean);
          importSpinsBatch(numbers, 'copy_paste');
          showToast(`Imported ${numbers.length} spins from JSON file`, 'success');
        }
      } catch (err) {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <History className="h-6 w-6 text-[#D4AF37]" /> Chronological Spin History ({spins.length})
          </h2>
          <p className="text-xs text-slate-400">
            Immutable session storage in Dexie IndexedDB with resolution tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportJSON}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-[#D4AF37]" /> Export JSON
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 cursor-pointer">
            <Upload className="h-3.5 w-3.5 text-emerald-400" /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={clearSessionSpins}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 text-xs font-semibold text-rose-300 border border-rose-800 hover:bg-rose-900 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear History
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter spins by number or input source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl bg-[#161D29] border border-[#232D3F] pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Spin History Table */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl overflow-x-auto">
        {filteredSpins.length === 0 ? (
          <p className="text-xs italic text-slate-500 text-center py-8">
            No spins match filter criteria or session is empty
          </p>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080B12] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#232D3F]">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Result</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Input Source</th>
                <th className="p-3">Prediction Resolution</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232D3F]">
              {filteredSpins.map((spin, idx) => {
                const totalIndex = spins.length - idx;
                const prediction = predictionMap.get(spin.id);

                return (
                  <tr key={spin.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-500">#{totalIndex}</td>
                    <td className="p-3">
                      {editingId === spin.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            className="w-12 rounded bg-[#080B12] border border-[#D4AF37] px-1 py-0.5 text-xs text-center font-bold text-slate-100"
                          />
                          <button
                            onClick={() => handleSaveEdit(spin.id)}
                            className="p-1 rounded bg-emerald-600 text-white"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <SpinChip number={spin.number} size="sm" />
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(spin.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                        {spin.source.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      {prediction ? (
                        <div className="flex items-center gap-2">
                          {prediction.hitNumber ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> 18 Candidates HIT
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                              <XCircle className="h-3 w-3 text-slate-500" /> Candidate Miss
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] italic text-slate-500">No snapshot baseline</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(spin.id, spin.number)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                          title="Edit Spin"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSpin(spin.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Delete Spin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
