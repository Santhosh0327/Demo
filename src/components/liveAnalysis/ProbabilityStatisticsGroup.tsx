import React, { useState } from 'react';
import {
  ChiSquareResult,
  EntropyResult,
  RunsTestResult,
  AutocorrelationResult,
} from '../../utils/mathLab';
import { AlertTriangle, Calculator, ChevronDown, ChevronUp, Info, ShieldCheck } from 'lucide-react';

interface ProbabilityStatisticsGroupProps {
  totalSpins: number;
  chiSquare: ChiSquareResult;
  entropy: EntropyResult;
  runsTest: RunsTestResult;
  autocorrelation: AutocorrelationResult[];
}

export const ProbabilityStatisticsGroup: React.FC<ProbabilityStatisticsGroupProps> = ({
  totalSpins,
  chiSquare,
  entropy,
  runsTest,
  autocorrelation,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              4. Probability & Statistical Diagnostics Module
            </h3>
            <p className="text-[11px] text-slate-400">
              Chi-Square Goodness-of-Fit, Shannon Entropy H(X), Wald-Wolfowitz Runs Test & Autocorrelation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            Diagnostics
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-6 text-xs">
          {/* Sample Size Adequacy Warning Banner if N < minRequiredSample */}
          {!chiSquare.isSufficientSample && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-300 text-xs">Statistical Uncertainty Warning</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {chiSquare.warningMessage ||
                    `Sample size N = ${totalSpins} is below the required minimum N = ${chiSquare.minRequiredSample} for standard chi-square assumptions (expected frequency >= 5 per pocket). P-values and significance conclusions are diagnostic approximations.`}
                </p>
              </div>
            </div>
          )}

          {/* Diagnostic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chi-Square Goodness-of-Fit */}
            <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  Chi-Square Goodness-of-Fit Test
                </span>
                <span className="text-[10px] text-slate-400">df = {chiSquare.degreesOfFreedom}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Chi-Square Statistic (&chi;&sup2;):</span>
                  <span className="font-mono font-bold text-amber-300">{chiSquare.chiSquare.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">p-value:</span>
                  <span className="font-mono font-bold text-slate-200">{chiSquare.pValue.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Uniformity Hypothesis (&alpha;=0.05):</span>
                  <span className={chiSquare.isStatisticallySignificant ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {chiSquare.isStatisticallySignificant ? 'Significant Bias Detected' : 'Consistent with Uniform'}
                  </span>
                </div>
              </div>
            </div>

            {/* Shannon Entropy */}
            <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  Shannon Entropy H(X)
                </span>
                <span className="text-[10px] text-slate-400">Information Theory</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Observed Entropy H(X):</span>
                  <span className="font-mono font-bold text-purple-300">{entropy.shannonEntropy.toFixed(4)} bits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Theoretical Entropy:</span>
                  <span className="font-mono text-slate-300">{entropy.maxPossibleEntropy.toFixed(4)} bits</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Uniformity Ratio:</span>
                  <span className="font-bold text-emerald-400">{entropy.uniformityPercentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Wald-Wolfowitz Runs Test */}
            <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  Wald-Wolfowitz Runs Test
                </span>
                <span className="text-[10px] text-slate-400">Temporal Independence</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Observed / Expected Runs:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {runsTest.observedRuns} / {runsTest.expectedRuns.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">z-score / p-value:</span>
                  <span className="font-mono text-slate-300">
                    z={runsTest.zScore.toFixed(2)} (p={runsTest.pValue.toFixed(4)})
                  </span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Independence at &alpha;=0.05:</span>
                  <span className={runsTest.isIndependentAtAlpha05 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {runsTest.isIndependentAtAlpha05 ? 'Independent Sequence' : 'Clustered / Dependent'}
                  </span>
                </div>
              </div>
            </div>

            {/* Autocorrelation Lags 1-5 */}
            <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#232D3F] pb-2">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  Autocorrelation (Lags 1 - 5)
                </span>
                <span className="text-[10px] text-slate-400">Time-Series Lags</span>
              </div>
              <div className="space-y-1.5">
                {autocorrelation.slice(0, 5).map((lag) => (
                  <div key={lag.lag} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lag {lag.lag}:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      r = {lag.autocorrelation.toFixed(3)}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">p={lag.pValue.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
