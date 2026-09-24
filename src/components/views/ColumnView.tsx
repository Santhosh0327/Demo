import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { getColumn } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';

interface ColumnViewProps {
  prediction: CandidatePrediction | null;
}

export const ColumnView: React.FC<ColumnViewProps> = ({ prediction }) => {
  const top18 = prediction?.candidateScores.slice(0, 18) || [];

  const c1 = top18.filter((c) => getColumn(c.number) === '1st');
  const c2 = top18.filter((c) => getColumn(c.number) === '2nd');
  const c3 = top18.filter((c) => getColumn(c.number) === '3rd');

  const predictedCol = prediction?.categoryCandidates.column;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Column Distribution View</h3>
            <p className="text-xs text-slate-400">
              Breakdown of top 18 candidates across 1st, 2nd, and 3rd vertical table columns
            </p>
          </div>

          {predictedCol && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Category Forecast</span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                ★ {predictedCol.candidate} ({predictedCol.confidence}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedCol?.candidate === '1st Column'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">1st Column (1, 4, 7... 34)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{c1.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {c1.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {c1.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 1st column</span>}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedCol?.candidate === '2nd Column'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">2nd Column (2, 5, 8... 35)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{c2.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {c2.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {c2.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 2nd column</span>}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedCol?.candidate === '3rd Column'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">3rd Column (3, 6, 9... 36)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{c3.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {c3.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {c3.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 3rd column</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
