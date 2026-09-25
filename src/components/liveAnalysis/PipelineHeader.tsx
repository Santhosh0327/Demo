import React, { useState } from 'react';
import { useRouletteStore } from '../../store/useRouletteStore';
import { Activity, AlertTriangle, Clock, Database, Layers, RotateCcw, Trash2, Zap } from 'lucide-react';
import { WheelType } from '../../types/roulette';

interface PipelineHeaderProps {
  calculationDurationMs: number;
  historyCutoff: number;
  heavyStatus: 'idle' | 'calculating' | 'complete' | 'stale';
}

export const PipelineHeader: React.FC<PipelineHeaderProps> = ({
  calculationDurationMs,
  historyCutoff,
  heavyStatus,
}) => {
  const { spins, wheelType, setWheelType, activeSessionId, sessions, undoLastSpin, clearSessionSpins } =
    useRouletteStore();

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [resetPnlOnClear, setResetPnlOnClear] = useState(false);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] p-4 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Session & Variant Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-100">Live Analysis Workspace</h2>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Session: <span className="text-slate-200 font-semibold">{activeSession?.name || 'Main Session'}</span>
            </p>
          </div>
        </div>

        {/* Wheel Type Selector & Quick Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-[#161D29] p-1 border border-[#232D3F]">
            <button
              onClick={() => setWheelType('European')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                wheelType === 'European'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              European (37)
            </button>
            <button
              onClick={() => setWheelType('American')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                wheelType === 'American'
                  ? 'bg-[#D4AF37] text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              American (38)
            </button>
          </div>

          <button
            onClick={undoLastSpin}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-amber-400 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 transition-all"
            title="Undo last spin entry"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>

          <button
            onClick={() => setShowClearConfirmation(true)}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 text-xs font-bold text-rose-400 border border-rose-800/40 hover:bg-rose-900/40 disabled:opacity-30 transition-all"
            title="Clear all session history"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Session
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Session */}
      {showClearConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#161D29] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">
                  Clear all data in {activeSession?.name || 'Main Session'}?
                </h3>
                <p className="text-xs text-rose-300/90 font-semibold mt-0.5">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080B12] p-3.5 rounded-xl border border-[#232D3F]">
              Clearing will permanently remove the current session's spins, candidate sets, mathematical calculations, forward-test evaluations, streaks, and prediction activation state.
            </p>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#080B12] border border-[#232D3F] cursor-pointer text-xs text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={resetPnlOnClear}
                onChange={(e) => setResetPnlOnClear(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-[#D4AF37] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span>Also reset P&amp;L Calculator configuration (show empty inputs)</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await clearSessionSpins(resetPnlOnClear);
                  setShowClearConfirmation(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 border border-rose-400 shadow-lg transition-all active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Clear Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics & Performance Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#232D3F]/60 text-xs">
        <div className="flex items-center gap-2 bg-[#161D29] p-2.5 rounded-xl border border-[#232D3F]">
          <Database className="h-4 w-4 text-emerald-400" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Sample Size</span>
            <span className="font-bold text-slate-100">{spins.length} Spins</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#161D29] p-2.5 rounded-xl border border-[#232D3F]">
          <Layers className="h-4 w-4 text-blue-400" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">History Cutoff</span>
            <span className="font-bold text-slate-100">Last {historyCutoff} Spins</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#161D29] p-2.5 rounded-xl border border-[#232D3F]">
          <Clock className="h-4 w-4 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Instant Calc</span>
            <span className="font-bold text-emerald-400">{calculationDurationMs} ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#161D29] p-2.5 rounded-xl border border-[#232D3F]">
          <Activity className="h-4 w-4 text-purple-400 animate-pulse" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Heavy Worker</span>
            <span
              className={`font-bold ${
                heavyStatus === 'calculating'
                  ? 'text-amber-400 animate-pulse'
                  : heavyStatus === 'complete'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {heavyStatus === 'calculating' ? 'Calculating...' : heavyStatus === 'complete' ? 'Complete' : 'Idle'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
