import React, { useState } from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { getPocketColor } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';
import { RotateCcw, Edit2, Check, Trash2 } from 'lucide-react';

export const ManualEntry: React.FC = () => {
  const { wheelType, addSpin, spins, undoLastSpin, updateSpin, deleteSpin } = useRouletteStore();
  const [editingSpinId, setEditingSpinId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const numbers = Array.from({ length: 36 }, (_, i) => (i + 1).toString());

  const handleKeyPress = (numStr: string) => {
    addSpin(numStr, 'manual');
  };

  const handleStartEdit = (spinId: string, currentNum: string) => {
    setEditingSpinId(spinId);
    setEditValue(currentNum);
  };

  const handleSaveEdit = (spinId: string) => {
    if (!editValue) return;
    updateSpin(spinId, editValue);
    setEditingSpinId(null);
  };

  const recentSpins = spins.slice(-10).reverse();

  return (
    <div className="space-y-6">
      {/* Keypad section */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">Manual Quick Keypad</h3>
            <p className="text-xs text-slate-400">
              Tap or click to record spins chronologically ({wheelType} Roulette)
            </p>
          </div>
          <button
            onClick={undoLastSpin}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-amber-400 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition-all"
          >
            <RotateCcw className="h-4 w-4" /> Quick Undo
          </button>
        </div>

        {/* Zero buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleKeyPress('0')}
            className="flex h-12 w-24 items-center justify-center rounded-xl bg-emerald-700 text-lg font-black text-white shadow-lg border border-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all"
          >
            0
          </button>
          {wheelType === 'American' && (
            <button
              onClick={() => handleKeyPress('00')}
              className="flex h-12 w-24 items-center justify-center rounded-xl bg-emerald-700 text-lg font-black text-white shadow-lg border border-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all"
            >
              00
            </button>
          )}
        </div>

        {/* 1-36 Numbers Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-2.5 pt-2">
          {numbers.map((numStr) => {
            const color = getPocketColor(numStr);
            let btnClass = 'bg-red-700 border-red-500 text-white hover:bg-red-600';
            if (color === 'black') {
              btnClass = 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800';
            }

            return (
              <button
                key={numStr}
                onClick={() => handleKeyPress(numStr)}
                className={`flex h-12 flex-col items-center justify-center rounded-xl font-black text-base shadow-md border active:scale-95 transition-all ${btnClass}`}
              >
                {numStr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent History & Correction List */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-slate-200">Recent Entry History & Corrections</h4>
        {spins.length === 0 ? (
          <p className="text-xs italic text-slate-500 py-4 text-center">No spins logged yet</p>
        ) : (
          <div className="divide-y divide-[#232D3F]">
            {recentSpins.map((spin) => (
              <div key={spin.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <SpinChip number={spin.number} size="md" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      Spin Number {spin.number}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {new Date(spin.timestamp).toLocaleTimeString()} ({spin.source})
                    </div>
                  </div>
                </div>

                {editingSpinId === spin.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 rounded-lg bg-[#080B12] border border-[#D4AF37] px-2 py-1 text-xs text-slate-100 text-center font-bold"
                    />
                    <button
                      onClick={() => handleSaveEdit(spin.id)}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(spin.id, spin.number)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                      title="Correct Spin"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSpin(spin.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Delete Spin"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
