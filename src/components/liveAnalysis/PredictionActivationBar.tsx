import React from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const PredictionActivationBar: React.FC = () => {
  const {
    isAutoModeActive,
    engineState,
    spins,
    latestSnapshot,
    activatePredictions,
    candidateUpdateStatus,
  } = useRouletteStore();

  const totalSpins = spins.length;
  const isGenerating = engineState === 'GENERATING';
  const minHistoryMet = totalSpins >= 10;

  const handleGenerateClick = async () => {
    if (isGenerating) return;
    await activatePredictions();
  };

  return (
    <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#161D29] via-[#1A2332] to-[#10151F] p-4 shadow-xl mb-5">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Status & Lifecycle Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
              isAutoModeActive
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : engineState === 'INSUFFICIENT_HISTORY'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
            }`}
          >
            {isGenerating ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : isAutoModeActive ? (
              <Zap className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black tracking-wide text-slate-100 uppercase">
                Prediction Engine Status:
              </span>

              {/* State Pill */}
              {isAutoModeActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(34,197,94,0.4)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  AUTO MODE ON ✓
                </span>
              ) : engineState === 'INSUFFICIENT_HISTORY' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-950 text-rose-300 border border-rose-600/60">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  INSUFFICIENT HISTORY
                </span>
              ) : isGenerating ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  GENERATING...
                </span>
              ) : engineState === 'UPDATE_FAILED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-950 text-rose-300 border border-rose-600/60">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  UPDATE FAILED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-amber-400 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  NOT STARTED (History Collection Mode)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-1">
              {isAutoModeActive
                ? 'AUTO MODE ON ✓ — New confirmed results automatically update predictions.'
                : isGenerating
                ? 'Generating initial candidate set...'
                : 'History Collection Mode — Enter results, then click Generate Predictions.'}
            </p>
          </div>
        </div>

        {/* Right: Actions & Info Badges */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Spin Counter indicator */}
          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Confirmed History
            </span>
            <span
              className={`font-black ${
                minHistoryMet ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {totalSpins} Spin{totalSpins !== 1 ? 's' : ''} Logged
              <span className="text-slate-500 font-normal text-[11px] ml-1">
                (Min 10 Required)
              </span>
            </span>
          </div>

          {/* Activation Button */}
          {!isAutoModeActive ? (
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg select-none ${
                isGenerating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                  : 'bg-gradient-to-r from-[#D4AF37] to-amber-500 text-slate-950 hover:from-amber-400 hover:to-amber-300 border border-amber-300 shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-slate-950" />
                  Generate Predictions
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Snapshot #{latestSnapshot?.version ?? 1} Active</span>
              <span className="text-slate-400 text-[11px]">
                (Cutoff #{latestSnapshot?.spinCutoffIndex ?? totalSpins})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
