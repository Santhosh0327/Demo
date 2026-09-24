import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { SpinChip } from '../common/SpinChip';
import { MIN_HISTORY_REQUIRED } from '../../utils/candidateEngine';
import { AlertCircle } from 'lucide-react';

interface Grid6x3ViewProps {
  prediction: CandidatePrediction | null;
}

export const Grid6x3View: React.FC<Grid6x3ViewProps> = ({ prediction }) => {
  if (!prediction || prediction.candidateScores.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-[#161D29] p-8 text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-[#D4AF37] mx-auto opacity-80" />
        <h4 className="text-sm font-bold text-slate-200">
          Insufficient Spin History for Candidate Generation
        </h4>
        <p className="text-xs text-slate-400">
          Minimum {MIN_HISTORY_REQUIRED} confirmed spins required in active session history to generate candidates.
        </p>
      </div>
    );
  }

  const top18 = prediction.candidateScores.slice(0, 18);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <h3 className="text-sm font-bold text-slate-100">
            6x3 Grid View — Top 18 Distinct Candidate Numbers
          </h3>
          <span className="text-xs font-mono text-[#D4AF37]">
            Ranked #1 to #18 by Deterministic Model Score
          </span>
        </div>

        {/* 6 columns x 3 rows grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {top18.map((candidate) => (
            <div
              key={candidate.number}
              className="flex flex-col justify-between rounded-xl border border-[#232D3F] bg-[#080B12] p-3.5 hover:border-[#D4AF37]/50 transition-all shadow-md group"
            >
              <div className="flex items-center justify-between">
                <SpinChip number={candidate.number} size="md" isCandidate rank={candidate.rank} />
                <div className="text-right">
                  <div className="text-xs font-black text-[#D4AF37]">{candidate.totalScore}%</div>
                  <div className="text-[9px] text-slate-500 font-mono">Score</div>
                </div>
              </div>

              {/* Score breakdown mini bars */}
              <div className="space-y-1 my-3 text-[9px] text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Freq</span>
                  <div className="w-12 h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${candidate.freqScore}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Recency</span>
                  <div className="w-12 h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${candidate.recencyScore}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Trans</span>
                  <div className="w-12 h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${candidate.transitionScore}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Sector</span>
                  <div className="w-12 h-1 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${candidate.sectorScore}%` }} />
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 line-clamp-2 italic border-t border-[#232D3F] pt-2">
                {candidate.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
