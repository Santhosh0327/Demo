import React from 'react';
import { NavLink } from 'react-router-dom';
import { useRouletteStore } from '../store/useRouletteStore';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { SpinChip } from '../components/common/SpinChip';
import { computeTrackingMetrics } from '../utils/tracking';
import { MIN_HISTORY_REQUIRED } from '../utils/candidateEngine';
import {
  Sparkles,
  TrendingUp,
  PlusCircle,
  BarChart3,
  Grid,
  ShieldCheck,
  Disc,
  AlertCircle,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { spins, currentPrediction, predictions, wheelType } = useRouletteStore();
  const metrics = computeTrackingMetrics(predictions, wheelType);

  const top18 = currentPrediction?.candidateScores.slice(0, 18) || [];
  const latestSpin = spins.length > 0 ? spins[spins.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <DisclaimerBanner />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Session Spins</span>
            <Disc className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-slate-100">{spins.length}</div>
          <div className="text-[10px] text-slate-400">Chronological IndexedDB Log</div>
        </div>

        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>18 Candidates Hit Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {metrics.totalPredictions > 0 ? `${metrics.numberHitRate}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {metrics.totalPredictions > 0 ? (
              <>Fair Baseline: <span className="font-bold text-[#D4AF37]">{metrics.numberFairBaseline}%</span> ({wheelType})</>
            ) : (
              <span>No verified predictions yet</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Red/Black Accuracy</span>
            <ShieldCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {metrics.totalPredictions > 0 ? `${metrics.categoryMetrics.redBlack.rate}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            {metrics.totalPredictions > 0 ? (
              <>Fair Baseline: {metrics.categoryMetrics.redBlack.baseline}%</>
            ) : (
              <span>No verified predictions yet</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Latest Spin Landed</span>
            <PlusCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            {latestSpin ? (
              <>
                <SpinChip number={latestSpin.number} size="md" />
                <span className="text-xs font-semibold text-slate-300">
                  {new Date(latestSpin.timestamp).toLocaleTimeString()}
                </span>
              </>
            ) : (
              <span className="text-xs italic text-slate-500">No spins logged</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Split: Current 18 Candidates Preview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Top 18 Candidates */}
        <div className="lg:col-span-2 rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
              <h3 className="text-base font-bold text-slate-100">
                Active 18 Candidates Preview (Next Spin)
              </h3>
            </div>
            <NavLink
              to="/table"
              className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <Grid className="h-3.5 w-3.5" /> Open Visualizer Views
            </NavLink>
          </div>

          {currentPrediction ? (
            <>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                {top18.map((c) => (
                  <SpinChip
                    key={c.number}
                    number={c.number}
                    size="md"
                    isCandidate
                    score={c.totalScore}
                    rank={c.rank}
                  />
                ))}
              </div>

              {/* Category Forecasts Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
                <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <div className="text-[10px] text-slate-400">Color</div>
                  <div className="font-extrabold text-[#D4AF37]">
                    {currentPrediction.categoryCandidates.redBlack.candidate}
                  </div>
                </div>
                <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <div className="text-[10px] text-slate-400">Dozen</div>
                  <div className="font-extrabold text-[#D4AF37]">
                    {currentPrediction.categoryCandidates.dozen.candidate}
                  </div>
                </div>
                <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <div className="text-[10px] text-slate-400">Column</div>
                  <div className="font-extrabold text-[#D4AF37]">
                    {currentPrediction.categoryCandidates.column.candidate}
                  </div>
                </div>
                <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <div className="text-[10px] text-slate-400">Parity</div>
                  <div className="font-extrabold text-[#D4AF37]">
                    {currentPrediction.categoryCandidates.oddEven.candidate}
                  </div>
                </div>
                <div className="bg-[#080B12] p-2.5 rounded-xl border border-[#232D3F]">
                  <div className="text-[10px] text-slate-400">Range</div>
                  <div className="font-extrabold text-[#D4AF37]">
                    {currentPrediction.categoryCandidates.highLow.candidate}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-[#080B12] p-8 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-[#D4AF37] mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-200">
                Insufficient History for Candidate Generation
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Minimum <span className="text-[#D4AF37] font-bold">{MIN_HISTORY_REQUIRED} confirmed spins</span> required to generate deterministic historical candidates (Currently {spins.length}/{MIN_HISTORY_REQUIRED} logged).
              </p>
              <NavLink
                to="/enter"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
              >
                <PlusCircle className="h-4 w-4" /> Add Spins in Input Center
              </NavLink>
            </div>
          )}
        </div>

        {/* Right Col: Quick Input Shortcut Cards */}
        <div className="rounded-2xl border border-[#232D3F] bg-[#161D29] p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-2">Input Center Quick Access</h3>
            <p className="text-xs text-slate-400 mb-4">
              Log new roulette spins using any of the 4 functional methods
            </p>

            <div className="space-y-2">
              <NavLink
                to="/enter"
                className="flex items-center justify-between p-3 rounded-xl bg-[#080B12] border border-[#232D3F] hover:border-[#D4AF37]/50 text-xs font-semibold text-slate-200 transition-all group"
              >
                <span>1. Touch Keypad Entry</span>
                <span className="text-[#D4AF37] group-hover:translate-x-1 transition-transform">→</span>
              </NavLink>
              <NavLink
                to="/enter"
                className="flex items-center justify-between p-3 rounded-xl bg-[#080B12] border border-[#232D3F] hover:border-[#D4AF37]/50 text-xs font-semibold text-slate-200 transition-all group"
              >
                <span>2. Screenshot OCR Upload</span>
                <span className="text-[#D4AF37] group-hover:translate-x-1 transition-transform">→</span>
              </NavLink>
              <NavLink
                to="/enter"
                className="flex items-center justify-between p-3 rounded-xl bg-[#080B12] border border-[#232D3F] hover:border-[#D4AF37]/50 text-xs font-semibold text-slate-200 transition-all group"
              >
                <span>3. Copy-Paste Batch Import</span>
                <span className="text-[#D4AF37] group-hover:translate-x-1 transition-transform">→</span>
              </NavLink>
              <NavLink
                to="/enter"
                className="flex items-center justify-between p-3 rounded-xl bg-[#080B12] border border-[#232D3F] hover:border-[#D4AF37]/50 text-xs font-semibold text-slate-200 transition-all group"
              >
                <span>4. Browser Screen Share OCR</span>
                <span className="text-[#D4AF37] group-hover:translate-x-1 transition-transform">→</span>
              </NavLink>
            </div>
          </div>

          <div className="pt-4 border-t border-[#232D3F] flex justify-between items-center text-xs">
            <NavLink to="/patterns" className="text-slate-400 hover:text-slate-200 flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-[#D4AF37]" /> Pattern Analytics
            </NavLink>
            <NavLink to="/performance" className="text-slate-400 hover:text-slate-200 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Tracking Stats
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
