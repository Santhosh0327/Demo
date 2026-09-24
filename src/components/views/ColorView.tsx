import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { getPocketColor } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';

interface ColorViewProps {
  prediction: CandidatePrediction | null;
}

export const ColorView: React.FC<ColorViewProps> = ({ prediction }) => {
  const top18 = prediction?.candidateScores.slice(0, 18) || [];

  const redCandidates = top18.filter((c) => getPocketColor(c.number) === 'red');
  const blackCandidates = top18.filter((c) => getPocketColor(c.number) === 'black');
  const greenCandidates = top18.filter((c) => getPocketColor(c.number) === 'green');

  const predictedRB = prediction?.categoryCandidates.redBlack;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Color Breakdown View (Red vs Black)</h3>
            <p className="text-xs text-slate-400">
              Distribution of candidates across roulette pocket colors
            </p>
          </div>

          {predictedRB && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Category Forecast</span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                ★ {predictedRB.candidate} ({predictedRB.confidence}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Red Candidates */}
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedRB?.candidate === 'Red'
                ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Red Candidates
              </span>
              <span className="text-xs font-mono text-[#D4AF37]">{redCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {redCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {redCandidates.length === 0 && <span className="text-xs italic text-slate-500">No red candidates</span>}
            </div>
          </div>

          {/* Black Candidates */}
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedRB?.candidate === 'Black'
                ? 'border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.3)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-600" /> Black Candidates
              </span>
              <span className="text-xs font-mono text-[#D4AF37]">{blackCandidates.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {blackCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {blackCandidates.length === 0 && <span className="text-xs italic text-slate-500">No black candidates</span>}
            </div>
          </div>
        </div>

        {greenCandidates.length > 0 && (
          <div className="rounded-xl border border-emerald-500/30 p-4 bg-emerald-950/20 flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-400">Green Pocket Candidates:</span>
            <div className="flex gap-2">
              {greenCandidates.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
