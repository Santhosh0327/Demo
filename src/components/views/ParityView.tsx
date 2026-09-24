import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { getParity } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';

interface ParityViewProps {
  prediction: CandidatePrediction | null;
}

export const ParityView: React.FC<ParityViewProps> = ({ prediction }) => {
  const top18 = prediction?.candidateScores.slice(0, 18) || [];

  const oddCandidates = top18.filter((c) => getParity(c.number) === 'Odd');
  const evenCandidates = top18.filter((c) => getParity(c.number) === 'Even');

  const predictedOE = prediction?.categoryCandidates.oddEven;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Parity Breakdown View (Odd vs Even)</h3>
            <p className="text-xs text-slate-400">
              Distribution of candidates between Odd and Even numbers
            </p>
          </div>

          {predictedOE && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Category Forecast</span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                ★ {predictedOE.candidate} ({predictedOE.confidence}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedOE?.candidate === 'Odd'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">Odd Candidates</span>
              <span className="text-xs font-mono text-[#D4AF37]">{oddCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {oddCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {oddCandidates.length === 0 && <span className="text-xs italic text-slate-500">No odd candidates</span>}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedOE?.candidate === 'Even'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">Even Candidates</span>
              <span className="text-xs font-mono text-[#D4AF37]">{evenCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {evenCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {evenCandidates.length === 0 && <span className="text-xs italic text-slate-500">No even candidates</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
