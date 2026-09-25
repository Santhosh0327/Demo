import React from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { EvaluationTargetFilter } from '../../types/roulette';
import { getPocketColor } from '../../utils/rouletteRules';

export const LivePerformanceStrip: React.FC = () => {
  const { performanceStats, evaluationTargetFilter, setEvaluationTargetFilter, wheelType } =
    useRouletteStore();

  const {
    latestSpinNumber,
    latestResult,
    currentStreak,
    longestStreak,
    totalEvaluatedSpins,
    totalHits,
    totalMisses,
    hitRatePercentage,
    latestEvaluatedVersion,
    latestEvaluatedSetSize,
  } = performanceStats;

  const pocketColor = latestSpinNumber ? getPocketColor(latestSpinNumber) : 'green';

  const colorBgClass =
    pocketColor === 'red'
      ? 'bg-red-950/80 text-red-300 border-red-700/50'
      : pocketColor === 'black'
      ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';

  const resultBadge = () => {
    switch (latestResult) {
      case 'HIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
            HIT
          </span>
        );
      case 'MISS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-700/50">
            <svg className="w-3.5 h-3.5 mr-1 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
            MISS
          </span>
        );
      case 'NOT_EVALUATED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            NOT EVALUATED
          </span>
        );
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEvaluationTargetFilter(e.target.value as EvaluationTargetFilter);
  };

  return (
    <div className="bg-amber-950/15 border border-amber-500/20 rounded-xl p-3.5 mb-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left metrics group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Latest Result badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-amber-500/10">
            <span className="text-slate-400 font-medium">Latest:</span>
            {latestSpinNumber !== null ? (
              <span className={`px-2 py-0.5 rounded font-mono font-bold border text-xs ${colorBgClass}`}>
                {latestSpinNumber}
              </span>
            ) : (
              <span className="text-slate-500 font-mono">—</span>
            )}
            {resultBadge()}
          </div>

          {/* Current Consecutive Hit Streak */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/10">
            <span className="text-slate-400 font-medium">Current Streak:</span>
            <span className={`font-mono font-extrabold text-sm ${currentStreak > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {currentStreak}
            </span>
            {currentStreak >= 3 && <span className="text-amber-400 animate-bounce">🔥</span>}
          </div>

          {/* Best Streak */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/10">
            <span className="text-slate-400 font-medium">Best Streak:</span>
            <span className="font-mono font-bold text-emerald-400">{longestStreak}</span>
            {longestStreak > 0 && <span>🏆</span>}
          </div>

          {/* Evaluated Counts */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/10">
            <span className="text-slate-400 font-medium">Evaluated:</span>
            <span className="font-mono text-slate-200 font-semibold">{totalEvaluatedSpins}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-mono font-medium">{totalHits} Hits</span>
            <span className="text-slate-500">/</span>
            <span className="text-rose-400 font-mono font-medium">{totalMisses} Misses</span>
            <span className="text-amber-300 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 ml-0.5">
              {hitRatePercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right evaluation target & version info */}
        <div className="flex items-center gap-3 ml-auto">
          {latestEvaluatedVersion !== null && (
            <div className="text-[11px] text-slate-400 font-mono hidden md:block">
              Eval Set #{latestEvaluatedVersion} ({latestEvaluatedSetSize} pockets)
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <label htmlFor="eval-target-select" className="text-[11px] font-medium text-amber-400/90 whitespace-nowrap">
              Eval Target:
            </label>
            <select
              id="eval-target-select"
              value={evaluationTargetFilter}
              onChange={handleTargetChange}
              className="bg-slate-950 text-amber-200 text-xs font-semibold rounded px-2 py-0.5 border border-amber-500/30 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="top18">Top 18 Shortlist (18)</option>
              <option value="all">All Union Pockets</option>
              <option value="min2">≥2 Theories Agreement</option>
              <option value="min4">≥4 Theories Agreement</option>
              <option value="all_applicable">All Applicable Theories</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
