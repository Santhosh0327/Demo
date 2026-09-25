import React from 'react';
import { CandidateMethodId, CandidateSnapshotRecord } from '../../utils/candidateEngineLab';
import { WheelType } from '../../types/roulette';
import { SpinChip } from '../common/SpinChip';
import { AlertTriangle, Award, CheckCircle2, Info, ShieldAlert, Sliders } from 'lucide-react';

interface MainCandidatePanelProps {
  snapshot: CandidateSnapshotRecord;
  wheelType: WheelType;
  totalSpins: number;
  activeMethod: CandidateMethodId;
  onMethodChange: (method: CandidateMethodId) => void;
}

const METHOD_LABELS: Record<CandidateMethodId, { title: string; desc: string }> = {
  weighted_ensemble: {
    title: 'Configurable Weighted Ensemble',
    desc: 'Combines Frequency, Recency, Transition, Neighbour, Opposite, Sector & Bayesian scores.',
  },
  frequency: {
    title: 'Frequency-Based Set',
    desc: 'Top 18 most frequently hit pockets in history cutoff.',
  },
  recency: {
    title: 'Recency-Based Set',
    desc: '18 numbers with the most recent occurrences.',
  },
  transition: {
    title: 'Transition-Based Set',
    desc: '18 numbers with highest historical transition counts following last winning number.',
  },
  wheel_neighbour: {
    title: 'Wheel-Neighbour Set',
    desc: '18 physical pockets adjacent to the last winning number on the wheel.',
  },
  opposite_pocket: {
    title: 'Opposite-Pocket Set',
    desc: '18 physical pockets centered around the diametrically opposite wheel pocket.',
  },
  sector: {
    title: 'Sector-Based Set',
    desc: 'Top 18 pockets from active wheel sector (Voisins du Zéro / Quadrant).',
  },
  bayesian: {
    title: 'Bayesian Dirichlet-Smoothed Set',
    desc: 'Top 18 numbers by Laplace-smoothed posterior probability.',
  },
};

export const MainCandidatePanel: React.FC<MainCandidatePanelProps> = ({
  snapshot,
  wheelType,
  totalSpins,
  activeMethod,
  onMethodChange,
}) => {
  const theoreticalRate = wheelType === 'European' ? (18 / 37) * 100 : (18 / 38) * 100;
  const theoreticalFraction = wheelType === 'European' ? '18/37' : '18/38';

  const methodInfo = METHOD_LABELS[activeMethod] || METHOD_LABELS.weighted_ensemble;

  return (
    <div className="rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#161D29] to-[#10151F] p-6 shadow-2xl space-y-5">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shadow-lg">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide text-slate-100">
                MAIN EXPERIMENTAL 18-NUMBER CANDIDATE SET
              </h2>
              <span className="rounded-lg bg-[#D4AF37]/15 px-2.5 py-0.5 text-xs font-black text-[#D4AF37] border border-[#D4AF37]/30">
                18 CANDIDATES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Active Strategy Engine: <span className="text-amber-300 font-bold">{methodInfo.title}</span>
            </p>
          </div>
        </div>

        {/* Candidate Engine Method Dropdown */}
        <div className="flex items-center gap-2 bg-[#080B12] p-1.5 rounded-xl border border-[#232D3F]">
          <Sliders className="h-4 w-4 text-[#D4AF37] ml-1" />
          <select
            value={activeMethod}
            onChange={(e) => onMethodChange(e.target.value as CandidateMethodId)}
            className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer pr-2"
          >
            {Object.entries(METHOD_LABELS).map(([key, info]) => (
              <option key={key} value={key} className="bg-[#10151F] text-slate-200 font-semibold">
                {info.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of 18 Candidates or Insufficient Data State */}
      {snapshot.selectedNumbers.length === 18 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-18 gap-2">
            {snapshot.selectedNumbers.map((numStr, idx) => (
              <div
                key={`${numStr}_${idx}`}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#080B12] border border-[#D4AF37]/30 shadow-md hover:border-[#D4AF37] hover:scale-105 transition-all"
              >
                <SpinChip number={numStr} size="lg" />
                <span className="text-[9px] font-extrabold text-slate-400 mt-1">#{idx + 1}</span>
              </div>
            ))}
          </div>

          {/* Coverage & Method Context */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080B12] p-3 rounded-xl border border-[#232D3F] text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300 font-semibold">{methodInfo.desc}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>
                Theoretical Coverage:{' '}
                <strong className="text-amber-300">
                  {theoreticalFraction} ({theoreticalRate.toFixed(2)}%)
                </strong>
              </span>
              <span>
                History Cutoff: <strong className="text-slate-200">{snapshot.historyCutoff} spins</strong>
              </span>
              <span>
                Last Update:{' '}
                <strong className="text-slate-200">
                  {new Date(snapshot.timestamp).toLocaleTimeString()}
                </strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 text-center space-y-2">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <h4 className="text-sm font-bold text-amber-300">Insufficient Confirmed Spin History</h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Log at least 1 confirmed result to generate initial 18-number candidate set.
            Currently {totalSpins} spins logged.
          </p>
        </div>
      )}

      {/* Mandatory Statistical Disclaimer */}
      <div className="rounded-xl bg-[#080B12] border border-amber-500/20 p-3 flex items-start gap-3 text-[11px] text-slate-400">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-300">EXPERIMENTAL STATISTICAL DISCLAMER:</strong> {snapshot.disclaimer}
        </p>
      </div>
    </div>
  );
};
