import React, { useState, useEffect } from 'react';
import { ImportPreviewPayload } from '../../types/casinoscores';
import { getPocketColor } from '../../utils/rouletteRules';
import { isValidRouletteNumber } from '../../utils/casinoScores';
import { CheckCircle2, X, Layers, Plus, Trash2 } from 'lucide-react';

interface ImportPreviewModalProps {
  isOpen: boolean;
  previewPayload: ImportPreviewPayload | null;
  onConfirm: (finalNumbers: string[]) => void;
  onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  previewPayload,
  onConfirm,
  onCancel,
}) => {
  const [editableNumbers, setEditableNumbers] = useState<string[]>([]);
  const [newNumberInput, setNewNumberInput] = useState('');

  useEffect(() => {
    if (previewPayload) {
      setEditableNumbers(previewPayload.newUniqueNumbers || []);
    }
  }, [previewPayload]);

  if (!isOpen || !previewPayload) return null;

  const { gameName, wheelType, targetSessionName, duplicateCount } = previewPayload;

  const handleRemoveNumber = (index: number) => {
    setEditableNumbers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNumber = () => {
    const clean = newNumberInput.trim();
    if (isValidRouletteNumber(clean, wheelType)) {
      setEditableNumbers((prev) => [...prev, clean]);
      setNewNumberInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#10151F] border border-[#232D3F] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232D3F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Editable Import Preview</h3>
              <p className="text-xs text-slate-400">
                Review and edit extracted spin numbers before importing.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overview Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#161D29] p-3 rounded-xl border border-[#232D3F]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Game Table</span>
            <div className="font-bold text-slate-100 mt-0.5">{gameName} ({wheelType})</div>
          </div>

          <div className="bg-[#161D29] p-3 rounded-xl border border-[#232D3F]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Target Session</span>
            <div className="font-bold text-[#D4AF37] mt-0.5">{targetSessionName}</div>
          </div>

          <div className="bg-[#161D29] p-3 rounded-xl border border-[#232D3F]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Extracted Spins</span>
            <div className="font-bold text-slate-100 mt-0.5">{editableNumbers.length} Unique Spins</div>
          </div>

          <div className="bg-[#161D29] p-3 rounded-xl border border-[#232D3F]">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Duplicates Ignored</span>
            <div className="font-bold text-amber-400 mt-0.5">{duplicateCount} Sequence Matches</div>
          </div>
        </div>

        {/* Editable Sequence Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Spins to Import ({editableNumbers.length}):
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Click × on chip to remove spin</span>
          </div>

          <div className="bg-[#080B12] p-4 rounded-xl border border-[#232D3F] max-h-40 overflow-y-auto flex flex-wrap gap-2">
            {editableNumbers.length === 0 ? (
              <p className="text-xs text-amber-400 italic">
                No unique spin numbers queued for import.
              </p>
            ) : (
              editableNumbers.map((num, idx) => (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full font-bold text-xs text-white shadow-sm border ${
                    getPocketColor(num) === 'red'
                      ? 'bg-red-600 border-red-500'
                      : getPocketColor(num) === 'black'
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-emerald-600 border-emerald-500'
                  }`}
                >
                  <span>{num}</span>
                  <button
                    onClick={() => handleRemoveNumber(idx)}
                    className="p-0.5 rounded-full hover:bg-black/30 transition-colors text-slate-300 hover:text-white"
                    title="Remove number"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add missing number manual input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder={`Add spin (0-${wheelType === 'American' ? '36/00' : '36'})...`}
              value={newNumberInput}
              onChange={(e) => setNewNumberInput(e.target.value)}
              className="bg-[#161D29] border border-[#232D3F] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={handleAddNumber}
              disabled={!isValidRouletteNumber(newNumberInput, wheelType)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#232D3F]">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(editableNumbers)}
            disabled={editableNumbers.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Import ({editableNumbers.length} Spins)
          </button>
        </div>
      </div>
    </div>
  );
};
