import React, { useState } from 'react';
import { HeavyAsyncAnalysisResults } from '../../utils/analysisPipeline';
import { Activity, ChevronDown, ChevronUp, Cpu, RefreshCw, TrendingDown } from 'lucide-react';

interface AsyncHeavyAnalysisGroupProps {
  heavyResults: HeavyAsyncAnalysisResults;
}

export const AsyncHeavyAnalysisGroup: React.FC<AsyncHeavyAnalysisGroupProps> = ({ heavyResults }) => {
  const [isOpen, setIsOpen] = useState(true);

  const { status, monteCarloSummary, bootstrapHitRateCI } = heavyResults;

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              6. Heavy Async Calculations & Monte Carlo / Bootstrap
            </h3>
            <p className="text-[11px] text-slate-400">
              Web Worker / Async Process for Monte Carlo Simulations & Non-Parametric Bootstrap CIs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded border ${
              status === 'calculating'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                : status === 'complete'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {status === 'calculating' ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Calculating...
              </span>
            ) : status === 'complete' ? (
              'Worker Complete'
            ) : (
              'Worker Idle'
            )}
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5 text-xs">
          {status === 'calculating' ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-6 text-center space-y-2">
              <RefreshCw className="mx-auto h-8 w-8 text-amber-400 animate-spin" />
              <h4 className="font-bold text-amber-300">Running Heavy Calculations Asynchronously...</h4>
              <p className="text-slate-400 text-[11px] max-w-md mx-auto">
                Monte Carlo synthetic baseline simulations and bootstrap resampling are running off the UI thread.
                Outdated results are automatically discarded if a new spin arrives before completion.
              </p>
            </div>
          ) : monteCarloSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monte Carlo Summary */}
              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                  <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    Monte Carlo Synthetic Baseline ({monteCarloSummary.numSimulations} Runs)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                    {monteCarloSummary.spinsPerSimulation} spins/run
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bankruptcy Rate ($0 Bankroll):</span>
                    <span className="font-extrabold text-rose-400">
                      {monteCarloSummary.bankruptcyRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Average Final Bankroll:</span>
                    <span className="font-bold text-slate-100">
                      ${monteCarloSummary.averageFinalBankroll.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Average Net Return:</span>
                    <span
                      className={`font-bold ${
                        monteCarloSummary.averageNetReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${monteCarloSummary.averageNetReturn.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Average Max Drawdown:</span>
                    <span className="font-bold text-amber-300">
                      {monteCarloSummary.averageMaxDrawdownPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Bootstrap Non-Parametric CI */}
              <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                  <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                    Bootstrap Non-Parametric 95% CI
                  </span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold">
                    500 Resamples
                  </span>
                </div>

                {bootstrapHitRateCI ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Mean Candidate Hit Rate:</span>
                      <span className="font-extrabold text-amber-300">
                        {(bootstrapHitRateCI.meanHitRate * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">95% Confidence Interval:</span>
                      <span className="font-mono font-bold text-slate-200">
                        [{(bootstrapHitRateCI.lowerCI * 100).toFixed(1)}% - {(bootstrapHitRateCI.upperCI * 100).toFixed(1)}%]
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 pt-2 border-t border-[#232D3F]/50">
                      Bootstrap resamples empirical pre-spin forward test results 500 times to estimate sampling variation bounds.
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No prediction resolution history for bootstrap.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic text-center py-4">
              Heavy calculations will execute after spin history is logged.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
