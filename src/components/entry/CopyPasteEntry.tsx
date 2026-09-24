import React, { useState, useMemo } from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import { Clipboard, ArrowDownUp, CheckCircle } from 'lucide-react';

export const CopyPasteEntry: React.FC = () => {
  const { importSpinsBatch } = useRouletteStore();
  const [rawText, setRawText] = useState('');
  const [isNewestFirst, setIsNewestFirst] = useState(false);

  const parsedNumbers = useMemo(() => {
    if (!rawText.trim()) return [];
    // Extract tokens
    const tokens = rawText.match(/\b(00|0|[1-9]|[12][0-9]|3[0-6])\b/g) || [];
    return isNewestFirst ? [...tokens].reverse() : tokens;
  }, [rawText, isNewestFirst]);

  const handleImport = () => {
    if (parsedNumbers.length === 0) return;
    importSpinsBatch(parsedNumbers, 'copy_paste');
    setRawText('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-[#D4AF37]" /> Copy-Paste Batch Import
          </h3>

          {/* Chronological order toggle */}
          <button
            onClick={() => setIsNewestFirst(!isNewestFirst)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080B12] border border-[#232D3F] text-xs font-semibold text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            <span>Order: {isNewestFirst ? 'Newest First (Reversed)' : 'Oldest First (Normal)'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Paste numbers from external spreadsheets, casino logs, or live chat. Delimiters can be spaces, commas, or line breaks.
        </p>

        <textarea
          rows={5}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste raw spin list here (e.g. 17, 34, 6, 27, 0, 15, 22...)"
          className="w-full rounded-xl bg-[#080B12] border border-[#232D3F] p-4 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D4AF37]"
        />

        {parsedNumbers.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-[#232D3F]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Extracted {parsedNumbers.length} valid numbers (Chronological Order):</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-[#080B12] rounded-xl border border-[#232D3F]">
              {parsedNumbers.map((num, idx) => (
                <SpinChip key={idx} number={num} size="sm" />
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all"
              >
                <CheckCircle className="h-4 w-4" /> Import {parsedNumbers.length} Spins
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
