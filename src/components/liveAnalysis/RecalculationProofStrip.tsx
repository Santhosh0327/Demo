import React from 'react';
import { CandidateSnapshotRecord, WheelType } from '../../types/roulette';
import { CandidateSetDiff } from '../../utils/candidateDiff';
import { getPocketColor } from '../../utils/rouletteRules';
import { Check, Clock, ShieldCheck } from 'lucide-react';

interface RecalculationProofStripProps {
  latestSnapshot: CandidateSnapshotRecord | null;
  previousSnapshot: CandidateSnapshotRecord | null;
  totalSpins: number;
  latestSpinNumber: string | null;
  wheelType: WheelType;
  calculationDurationMs: number;
  candidateDiff: CandidateSetDiff;
  isAutoModeActive: boolean;
}

export const RecalculationProofStrip: React.FC<RecalculationProofStripProps> = ({
  latestSnapshot,
  totalSpins,
  latestSpinNumber,
  calculationDurationMs,
  candidateDiff,
  isAutoModeActive,
}) => {
  if (!isAutoModeActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-2.5 px-4 bg-[#0D1219] rounded-xl border border-amber-500/30 text-slate-300">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-bold text-amber-300">History Collection Mode:</span>
          <span className="text-slate-400">
            {totalSpins} spin{totalSpins !== 1 ? 's' : ''} logged. Click "Generate Predictions" to start Auto Mode calculations.
          </span>
        </div>
      </div>
    );
  }

  const version = latestSnapshot?.version ?? 1;
  const cutoffIndex = latestSnapshot?.spinCutoffIndex ?? totalSpins;
  const timestampStr = latestSnapshot
    ? new Date(latestSnapshot.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const pocketColor = latestSpinNumber ? getPocketColor(latestSpinNumber) : 'green';
  const pocketBg =
    pocketColor === 'red'
      ? 'bg-red-700 border-red-500 text-white'
      : pocketColor === 'black'
      ? 'bg-slate-900 border-slate-600 text-white'
      : 'bg-emerald-700 border-emerald-500 text-white';

  const isUnchanged = !candidateDiff.hasChanges || latestSnapshot?.isRecalculatedUnchanged;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-2.5 px-4 bg-gradient-to-r from-[#0D1219] via-[#141B26] to-[#0D1219] rounded-xl border border-[#D4AF37]/30 shadow-md">
      {/* Proof Info Items */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300 font-medium">
        {/* Latest Spin Badge */}
        {latestSpinNumber !== null && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">Spin #{cutoffIndex}:</span>
            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md border text-xs font-black select-none ${pocketBg}`}>
              {latestSpinNumber}
            </span>
          </div>
        )}

        {/* History Used */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400">History used:</span>
          <strong className="text-slate-100 font-bold">Spins 1–{cutoffIndex}</strong>
          <span className="text-slate-500">({cutoffIndex} total)</span>
        </div>

        {/* Theories Recalculated */}
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <strong className="text-amber-300 font-bold">8 theories recalculated</strong>
        </div>

        {/* Calculation Duration & Version */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <span>Set #{version}</span>
          <span>•</span>
          <span>{timestampStr}</span>
          {calculationDurationMs > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{calculationDurationMs.toFixed(1)}ms</span>
            </>
          )}
        </div>
      </div>

      {/* Recalculation Proof Badge */}
      <div className="flex items-center gap-2">
        {isUnchanged ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm">
            <Check className="w-3.5 h-3.5 mr-1 text-amber-400 stroke-[3]" />
            RECALCULATED ✓ — SET UNCHANGED
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
            <Check className="w-3.5 h-3.5 mr-1 text-emerald-400 stroke-[3]" />
            SET UPDATED ✓
          </span>
        )}
      </div>
    </div>
  );
};
