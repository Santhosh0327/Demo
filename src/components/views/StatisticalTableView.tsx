import React from 'react';
import { CandidatePrediction } from '../../types/roulette';
import { SpinChip } from '../common/SpinChip';
import { MIN_HISTORY_REQUIRED } from '../../utils/candidateEngine';
import { AlertCircle } from 'lucide-react';

interface StatisticalTableViewProps {
  prediction: CandidatePrediction | null;
}

export const StatisticalTableView: React.FC<StatisticalTableViewProps> = ({ prediction }) => {
  if (!prediction || prediction.candidateScores.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-[#161D29] p-8 text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-[#D4AF37] mx-auto opacity-80" />
        <h4 className="text-sm font-bold text-slate-200">
          Insufficient Spin History for Statistical Ranking
        </h4>
        <p className="text-xs text-slate-400">
          Minimum {MIN_HISTORY_REQUIRED} confirmed spins required in active session history to calculate candidate scores.
        </p>
      </div>
    );
  }

  const scores = prediction.candidateScores;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
          <h3 className="text-sm font-bold text-slate-100">
            Detailed Statistical Table View (All Wheel Numbers Ranked)
          </h3>
          <span className="text-xs text-[#D4AF37] font-mono">
            Showing component breakdown scores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080B12] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#232D3F]">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Number</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Total Score</th>
                <th className="p-3 text-right">Frequency</th>
                <th className="p-3 text-right">Recency</th>
                <th className="p-3 text-right">Transition</th>
                <th className="p-3 text-right">Sector</th>
                <th className="p-3 text-right">Opposite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232D3F]">
              {scores.map((item) => {
                const isTop18 = item.rank <= 18;
                return (
                  <tr
                    key={item.number}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isTop18 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="p-3 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isTop18
                            ? 'bg-[#D4AF37] text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{item.rank}
                      </span>
                    </td>
                    <td className="p-3">
                      <SpinChip number={item.number} size="sm" />
                    </td>
                    <td className="p-3">
                      {isTop18 ? (
                        <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                          Top 18 Candidate
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Unselected</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-[#D4AF37]">{item.totalScore}%</td>
                    <td className="p-3 text-right font-mono text-emerald-400">{item.freqScore}%</td>
                    <td className="p-3 text-right font-mono text-sky-400">{item.recencyScore}%</td>
                    <td className="p-3 text-right font-mono text-amber-400">{item.transitionScore}%</td>
                    <td className="p-3 text-right font-mono text-purple-400">{item.sectorScore}%</td>
                    <td className="p-3 text-right font-mono text-rose-400">{item.oppositeScore}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
