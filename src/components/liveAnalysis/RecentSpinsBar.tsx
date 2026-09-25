import React, { useState } from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import { Check, Edit2, History, Trash2 } from 'lucide-react';

export const RecentSpinsBar: React.FC = () => {
  const { spins, updateSpin, deleteSpin } = useRouletteStore();
  const [editingSpinId, setEditingSpinId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Show last 20, newest first
  const recentSpins = spins.slice(-20).reverse();

  const handleStartEdit = (spinId: string, num: string) => {
    setEditingSpinId(spinId);
    setEditValue(num);
  };

  const handleSaveEdit = (spinId: string) => {
    if (editValue.trim() !== '') {
      updateSpin(spinId, editValue.trim());
    }
    setEditingSpinId(null);
  };

  if (spins.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#232D3F] bg-[#10151F] p-4 text-center">
        <History className="mx-auto h-6 w-6 text-slate-500 mb-1" />
        <p className="text-xs font-semibold text-slate-400">No Confirmed Spins Recorded Yet</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Add results using the Manual Keypad, OCR Screenshot, Copy-Paste, or Screen Share tabs above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] p-4 shadow-xl space-y-3">
      {/* Header: total count + most recent label */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 whitespace-nowrap">
            Recent Confirmed Results
          </h3>
          <span className="rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2.5 py-0.5 text-[11px] font-black text-[#D4AF37]">
            Total: {spins.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 italic shrink-0">
          Showing last {recentSpins.length}
        </span>
      </div>

      {/* Horizontal Spin Chips — each spin is one compact chip with its own border/padding */}
      <div className="flex items-end gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {recentSpins.map((spin, idx) => {
          const isLatest = idx === 0;
          return (
            <div
              key={spin.id}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border transition-all min-w-[52px] ${
                isLatest
                  ? 'bg-[#1a2235] border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/5'
                  : 'bg-[#0D1219] border-[#232D3F] hover:border-slate-600'
              }`}
            >
              {/* Single spin chip — one number per chip */}
              <SpinChip number={spin.number} size="md" />

              {/* Timestamp */}
              <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap">
                {new Date(spin.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>

              {/* Edit / Delete */}
              {editingSpinId === spin.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(spin.id)}
                    className="w-10 rounded bg-[#080B12] border border-[#D4AF37] text-[10px] font-bold text-center text-slate-100 py-0.5"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(spin.id)}
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(spin.id, spin.number)}
                    className="text-slate-400 hover:text-amber-300"
                    title="Correct this spin"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteSpin(spin.id)}
                    className="text-slate-400 hover:text-rose-400"
                    title="Delete this spin"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 border-t border-[#232D3F] pt-2">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] inline-block" /> Latest spin
        </span>
        <span>• Each chip = one confirmed spin record</span>
        <span>• Click <Edit2 className="inline h-2.5 w-2.5" /> to correct, <Trash2 className="inline h-2.5 w-2.5" /> to remove</span>
      </div>
    </div>
  );
};
