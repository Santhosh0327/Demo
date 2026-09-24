import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { getRange } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';

interface RangeViewProps {
  prediction: CandidatePrediction | null;
}

export const RangeView: React.FC<RangeViewProps> = ({ prediction }) => {
  const top18 = prediction?.candidateScores.slice(0, 18) || [];

  const lowCandidates = top18.filter((c) => getRange(c.number) === 'Low');
  const highCandidates = top18.filter((c) => getRange(c.number) === 'High');

  const predictedHL = prediction?.categoryCandidates.highLow;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Range Breakdown View (Low vs High)</h3>
            <p className="text-xs text-slate-400">
              Distribution of candidates between Low (1–18) and High (19–36) numbers
            </p>
          </div>

          {predictedHL && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Category Forecast</span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                ★ {predictedHL.candidate} ({predictedHL.confidence}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedHL?.candidate === 'Low'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">Low Candidates (1–18)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{lowCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {lowCandidates.length === 0 && <span className="text-xs italic text-slate-500">No low candidates</span>}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedHL?.candidate === 'High'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">High Candidates (19–36)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{highCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {highCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {highCandidates.length === 0 && <span className="text-xs italic text-slate-500">No high candidates</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
