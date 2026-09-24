import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { getDozen } from '../../utils/rouletteRules';
import { SpinChip } from '../common/SpinChip';

interface DozenViewProps {
  prediction: CandidatePrediction | null;
}

export const DozenView: React.FC<DozenViewProps> = ({ prediction }) => {
  const top18 = prediction?.candidateScores.slice(0, 18) || [];
  const candidateSet = new Set(top18.map((c) => c.number));

  const d1 = top18.filter((c) => getDozen(c.number) === '1st');
  const d2 = top18.filter((c) => getDozen(c.number) === '2nd');
  const d3 = top18.filter((c) => getDozen(c.number) === '3rd');

  const predictedDozen = prediction?.categoryCandidates.dozen;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Dozen Distribution View</h3>
            <p className="text-xs text-slate-400">
              Breakdown of top 18 candidates across 1st (1-12), 2nd (13-24), and 3rd (25-36) Dozens
            </p>
          </div>

          {predictedDozen && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Category Forecast</span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                ★ {predictedDozen.candidate} ({predictedDozen.confidence}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1st Dozen Column */}
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedDozen?.candidate === '1st Dozen'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">1st Dozen (1–12)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{d1.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {d1.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {d1.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 1st dozen</span>}
            </div>
          </div>

          {/* 2nd Dozen Column */}
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedDozen?.candidate === '2nd Dozen'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">2nd Dozen (13–24)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{d2.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {d2.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {d2.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 2nd dozen</span>}
            </div>
          </div>

          {/* 3rd Dozen Column */}
          <div
            className={`rounded-xl border p-4 bg-[#080B12] space-y-3 ${
              predictedDozen?.candidate === '3rd Dozen'
                ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'border-[#232D3F]'
            }`}
          >
            <div className="flex justify-between items-center border-b border-[#232D3F] pb-2">
              <span className="text-xs font-bold text-slate-200">3rd Dozen (25–36)</span>
              <span className="text-xs font-mono text-[#D4AF37]">{d3.length} Candidates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {d3.map((c) => (
                <SpinChip key={c.number} number={c.number} size="md" isCandidate score={c.totalScore} />
              ))}
              {d3.length === 0 && <span className="text-xs italic text-slate-500">No candidates in 3rd dozen</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
