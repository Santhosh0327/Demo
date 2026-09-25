/**
 * ConsolidatedTheoryPanel.tsx
 *
 * Single consolidated view of all 8 theory outputs with:
 *  - Candidate Set Comparison Diff (Added/Removed/Unchanged counts & badges)
 *  - GREEN Added Number Highlights inside updated grid with "+" badge
 *  - RED Removed Numbers compact row immediately below grid with "−" badge
 *  - Update Confirmation ("SET UPDATED ✓", "RECALCULATED — NO NUMBER CHANGES", or "Initial candidate set")
 *  - Live Performance & Consecutive Hit Streak Strip
 *  - Deduplicated union grid with per-pocket agreement badges & HIT highlights
 *  - Agreement filter tabs & optional Top-18 shortlist
 *  - Collapsible detailed theory-contributions table
 */

import React, { useMemo, useState } from 'react';
import { CandidateMethodId, CandidateSnapshotRecord as LabCandidateSnapshotRecord } from '../../utils/candidateEngineLab';
import { WheelType, CandidateSnapshotRecord, EvaluationTargetFilter } from '../../types/roulette';
import {
  buildTheoryUnion,
  applyUnionFilter,
  getTopNByAgreement,
  METHOD_LABELS,
  METHOD_ORDER,
  FilterLevel,
  UnionPocketEntry,
} from '../../utils/theoryUnion';
import { getPocketColor } from '../../utils/rouletteRules';
import { useRouletteStore } from '../../store/useRouletteStore';
import { LivePerformanceStrip } from './LivePerformanceStrip';
import { RecalculationProofStrip } from './RecalculationProofStrip';
import { compareCandidateSets, CandidateSetDiff } from '../../utils/candidateDiff';
import { getNumbersForFilter } from '../../utils/candidateTracker';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Info,
  Layers,
  ListFilter,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsolidatedTheoryPanelProps {
  allMethods: Record<CandidateMethodId, LabCandidateSnapshotRecord>;
  wheelType: WheelType;
  totalSpins: number;
  calculationDurationMs?: number;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function pocketBg(num: string): string {
  const c = getPocketColor(num);
  if (c === 'red') return 'bg-red-700 border-red-500';
  if (c === 'black') return 'bg-slate-900 border-slate-600';
  return 'bg-emerald-700 border-emerald-500';
}

function agreementColour(count: number, total: number): string {
  if (total === 0) return 'bg-slate-700 text-slate-300';
  const ratio = count / total;
  if (ratio === 1) return 'bg-[#D4AF37] text-slate-950';
  if (ratio >= 0.75) return 'bg-amber-500 text-slate-950';
  if (ratio >= 0.5) return 'bg-amber-700 text-white';
  if (ratio >= 0.25) return 'bg-slate-600 text-slate-200';
  return 'bg-slate-700 text-slate-400';
}

// ─── Filter tab config ────────────────────────────────────────────────────────

// ─── Filter tab config ────────────────────────────────────────────────────────

const FILTER_OPTS: { id: EvaluationTargetFilter; label: string }[] = [
  { id: 'top18', label: 'Top 18 Shortlist' },
  { id: 'all', label: 'All Union Pockets' },
  { id: 'min2', label: '≥ 2 Theories' },
  { id: 'min4', label: '≥ 4 Theories' },
  { id: 'all_applicable', label: 'All Applicable' },
];

// ─── Pocket chip with agreement badge, HIT glow & ADDED badge ──────────────────

const PocketChip: React.FC<{
  entry: UnionPocketEntry;
  applicableCount: number;
  isSelected: boolean;
  isHit: boolean;
  isAdded: boolean;
  onClick: () => void;
}> = ({ entry, applicableCount, isSelected, isHit, isAdded, onClick }) => (
  <button
    onClick={onClick}
    title={`${entry.number} — included by ${entry.agreementCount}/${applicableCount} theories${isHit ? ' (LATEST HIT!)' : ''}${isAdded ? ' (NEWLY ADDED TO SET!)' : ''}`}
    className={`relative flex flex-col items-center justify-center rounded-xl border-2 transition-all hover:scale-105 active:scale-95 select-none
      ${pocketBg(entry.number)}
      ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#080B12] scale-105' : ''}
      ${isHit ? 'ring-4 ring-emerald-400 border-emerald-400 bg-emerald-950/80 shadow-[0_0_20px_#22c55e] scale-105 motion-safe:animate-pulse' : ''}
      ${isAdded && !isHit ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/90 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : ''}
    `}
    style={{ minWidth: '52px', minHeight: '62px', padding: '4px' }}
  >
    {/* Newly Added '+' Badge */}
    {isAdded && (
      <span className="absolute -top-2 -left-2 flex h-5 px-1.5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-black shadow-md bg-emerald-500 text-slate-950 border border-emerald-300 z-10">
        +
      </span>
    )}

    {/* Hit Indicator Ribbon */}
    {isHit && (
      <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center bg-emerald-500 text-slate-950 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-lg border border-emerald-300 z-10 whitespace-nowrap">
        HIT ✓
      </span>
    )}

    {/* Agreement badge */}
    <span
      className={`absolute -top-2 -right-2 flex h-5 px-1.5 min-w-[20px] items-center justify-center rounded-full text-[9px] font-black shadow-md ${agreementColour(entry.agreementCount, applicableCount)}`}
    >
      {entry.agreementCount}/{applicableCount}
    </span>

    {/* Number */}
    <span className="text-base font-black text-white leading-tight">{entry.number}</span>

    {/* Theory abbreviations row */}
    <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 max-w-[48px]">
      {entry.theories.map((t) => (
        <span key={t.methodId} className="text-[7px] font-bold text-white/60 leading-tight">
          {METHOD_LABELS[t.methodId].shortName}
        </span>
      ))}
    </div>
  </button>
);

// ─── Theory status row for the compact summary table ─────────────────────────

const TheoryStatusRow: React.FC<{
  methodId: CandidateMethodId;
  snapshot: LabCandidateSnapshotRecord;
  selectedPocket: string | null;
}> = ({ methodId, snapshot, selectedPocket }) => {
  const info = METHOD_LABELS[methodId];
  const available = snapshot.isSufficientData && snapshot.selectedNumbers.length > 0;
  const containsSelected =
    selectedPocket !== null && snapshot.selectedNumbers.includes(selectedPocket);
  const rankOfSelected = containsSelected
    ? snapshot.selectedNumbers.indexOf(selectedPocket!) + 1
    : null;

  return (
    <tr className={`border-t border-[#232D3F] text-[11px] ${containsSelected ? 'bg-[#D4AF37]/5' : ''}`}>
      <td className="py-2 pr-3 font-bold text-slate-300 whitespace-nowrap">
        <span className="mr-1.5 inline-flex items-center justify-center rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-400">
          {info.shortName}
        </span>
        {info.fullName}
      </td>
      <td className="py-2 pr-3">
        {available ? (
          <span className="text-emerald-400 font-bold">✓ {snapshot.historyCutoff} spins</span>
        ) : (
          <span className="text-rose-400 italic">Unavailable — insufficient history</span>
        )}
      </td>
      <td className="py-2 pr-3 text-slate-400">{available ? snapshot.selectedNumbers.length : '—'}</td>
      <td className="py-2">
        {containsSelected ? (
          <span className="font-black text-[#D4AF37]">#{rankOfSelected}</span>
        ) : selectedPocket !== null && available ? (
          <span className="text-slate-500 italic">not included</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const ConsolidatedTheoryPanel: React.FC<ConsolidatedTheoryPanelProps> = ({
  allMethods,
  wheelType,
  totalSpins,
  calculationDurationMs = 0,
}) => {
  const [showContributions, setShowContributions] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState<string | null>(null);
  const [showTop18, setShowTop18] = useState<boolean>(false);

  const {
    candidateUpdateStatus,
    latestSnapshot,
    previousSnapshot,
    performanceStats,
    isAutoModeActive,
    evaluationTargetFilter,
    setEvaluationTargetFilter,
  } = useRouletteStore();

  const activeFilter = evaluationTargetFilter;

  // ── Build union ──────────────────────────────────────────────────────────
  const union = useMemo(
    () => buildTheoryUnion(allMethods, wheelType),
    [allMethods, wheelType]
  );

  const top18 = useMemo(
    () => getTopNByAgreement(union.allUnionPockets, 18),
    [union.allUnionPockets]
  );

  // ── Apply filter ─────────────────────────────────────────────────────────
  const filteredPockets = useMemo(() => {
    if (evaluationTargetFilter === 'top18') {
      return getTopNByAgreement(union.allUnionPockets, 18);
    }
    return applyUnionFilter(
      union.allUnionPockets,
      evaluationTargetFilter as FilterLevel,
      union.applicableTheoryCount
    );
  }, [union, evaluationTargetFilter]);

  // ── Compute candidate set diff under the active view mode ─────────────────
  const candidateDiff = useMemo(() => {
    const currSet = latestSnapshot
      ? getNumbersForFilter(latestSnapshot.filterNumbers, evaluationTargetFilter)
      : filteredPockets.map((p) => p.number);

    const prevSet = previousSnapshot
      ? getNumbersForFilter(previousSnapshot.filterNumbers, evaluationTargetFilter)
      : null;

    return compareCandidateSets(prevSet, currSet);
  }, [latestSnapshot, previousSnapshot, evaluationTargetFilter, filteredPockets]);

  // ── Selected pocket detail ────────────────────────────────────────────────
  const selectedEntry = useMemo(
    () =>
      selectedPocket !== null
        ? union.allUnionPockets.find((p) => p.number === selectedPocket) ?? null
        : null,
    [selectedPocket, union.allUnionPockets]
  );

  // ── Insufficient history state ────────────────────────────────────────────
  if (union.applicableTheoryCount === 0) {
    return (
      <div className="rounded-2xl border-2 border-[#D4AF37]/30 bg-gradient-to-b from-[#161D29] to-[#10151F] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100">CONSOLIDATED THEORY UNION</h2>
              <p className="text-xs text-slate-400">Deduplicated number grid from all applicable strategies</p>
            </div>
          </div>

          <CandidateStatusIndicator
            status={candidateUpdateStatus}
            snapshot={latestSnapshot}
            diff={candidateDiff}
            isAutoModeActive={isAutoModeActive}
          />
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 text-center space-y-2">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <h4 className="text-sm font-bold text-amber-300">No Applicable Theories Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All 8 strategies currently report insufficient confirmed history.
            Log at least 10 confirmed spin results to activate the frequency-based and Bayesian strategies.
            Currently {totalSpins} spin{totalSpins !== 1 ? 's' : ''} logged.
          </p>
          <div className="text-[10px] text-slate-500 mt-2">
            Most strategies require a minimum of 10 spins to produce valid candidate sets.
          </div>
        </div>

        <Disclaimer />
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#161D29] to-[#10151F] shadow-2xl space-y-0 overflow-hidden">
      {/* ── Header & Status Confirmation ── */}
      <div className="p-5 border-b border-[#232D3F] space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shadow-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-wide text-slate-100">
                  CONSOLIDATED THEORY UNION
                </h2>
                <span className="rounded-lg bg-[#D4AF37]/15 px-2.5 py-0.5 text-xs font-black text-[#D4AF37] border border-[#D4AF37]/30">
                  {union.allUnionPockets.length} UNIQUE POCKETS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deduplicated union from{' '}
                <span className="text-amber-300 font-bold">{union.applicableTheoryCount}</span> of 8 applicable theories
                {union.unavailableTheoryIds.length > 0 && (
                  <span className="text-slate-500">
                    {' '}({union.unavailableTheoryIds.length} unavailable — insufficient history)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Top-Right Status Confirmation Badge & Version Metadata */}
          <CandidateStatusIndicator
            status={candidateUpdateStatus}
            snapshot={latestSnapshot}
            diff={candidateDiff}
            isAutoModeActive={isAutoModeActive}
          />
        </div>

        {/* Unavailable theory badges */}
        {union.unavailableTheoryIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {union.unavailableTheoryIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-md bg-rose-950/30 border border-rose-800/30 px-2 py-0.5 text-[10px] text-rose-400 font-semibold"
              >
                <X className="h-3 w-3" />
                {METHOD_LABELS[id].shortName}: unavailable
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Proof of Recalculation & Live Performance Strip ── */}
      <div className="p-4 pb-0 space-y-3">
        <RecalculationProofStrip
          latestSnapshot={latestSnapshot}
          previousSnapshot={previousSnapshot}
          totalSpins={totalSpins}
          latestSpinNumber={performanceStats.latestSpinNumber}
          wheelType={wheelType}
          calculationDurationMs={calculationDurationMs}
          candidateDiff={candidateDiff}
          isAutoModeActive={isAutoModeActive}
        />
        <LivePerformanceStrip />
        <CandidateSetDiffBar diff={candidateDiff} />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 p-3 bg-[#0D1219] border-y border-[#232D3F] mt-3 flex-wrap">
        <ListFilter className="h-4 w-4 text-slate-500 mr-1 shrink-0" />
        {FILTER_OPTS.map((f) => {
          const count =
            f.id === 'top18'
              ? getTopNByAgreement(union.allUnionPockets, 18).length
              : applyUnionFilter(union.allUnionPockets, f.id as FilterLevel, union.applicableTheoryCount).length;
          const isActive = evaluationTargetFilter === f.id;

          return (
            <button
              key={f.id}
              onClick={() => setEvaluationTargetFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                isActive
                  ? 'bg-[#D4AF37] text-slate-950'
                  : 'text-slate-400 hover:text-slate-200 bg-[#161D29] border border-[#232D3F]'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Union number grid & Removed Numbers ── */}
      <div className="p-5 space-y-4">
        {filteredPockets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#232D3F] p-8 text-center space-y-2">
            <Filter className="mx-auto h-7 w-7 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">
              No pockets match the current filter.
            </p>
            <p className="text-[11px] text-slate-500">
              Try a less restrictive filter, or log more spin history to activate additional theories.
            </p>
          </div>
        ) : (
          <>
            {/* Grid header */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Showing <strong className="text-slate-200">{filteredPockets.length}</strong> unique pocket{filteredPockets.length !== 1 ? 's' : ''}
                {activeFilter !== 'all' && (
                  <span className="text-slate-500"> (filtered from {union.allUnionPockets.length} total)</span>
                )}
              </span>
              <span className="text-slate-500">Click a pocket to see its theory breakdown</span>
            </div>

            {/* Pocket grid with HIT highlight & GREEN ADDED badge */}
            <div className="flex flex-wrap gap-2">
              {filteredPockets.map((entry) => {
                const isHit =
                  performanceStats.latestResult === 'HIT' &&
                  performanceStats.latestSpinNumber === entry.number;

                const isAdded = !candidateDiff.isInitial && candidateDiff.added.includes(entry.number);

                return (
                  <PocketChip
                    key={entry.number}
                    entry={entry}
                    applicableCount={union.applicableTheoryCount}
                    isSelected={selectedPocket === entry.number}
                    isHit={isHit}
                    isAdded={isAdded}
                    onClick={() =>
                      setSelectedPocket((prev) => (prev === entry.number ? null : entry.number))
                    }
                  />
                );
              })}
            </div>

            {/* ── Separate Compact "Removed from Previous Set" Row (RED) ── */}
            {!candidateDiff.isInitial && candidateDiff.removed.length > 0 && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/15 p-4 space-y-2.5 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-slate-950 text-xs font-black shadow-md">
                      −
                    </span>
                    <span>REMOVED FROM PREVIOUS SET ({candidateDiff.removedCount})</span>
                  </div>
                  <span className="text-[11px] text-rose-400/80 italic">No longer present in updated grid</span>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {candidateDiff.removed.map((num) => (
                    <div
                      key={num}
                      className={`relative flex items-center justify-center rounded-xl border-2 font-black text-sm text-white px-3.5 py-2.5 select-none shadow-md ${pocketBg(num)} bg-rose-950/80 border-rose-500`}
                      style={{ minWidth: '48px', minHeight: '52px' }}
                    >
                      <span className="absolute -top-2 -left-2 flex h-5 px-1.5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-black shadow-md bg-rose-500 text-slate-950 border border-rose-300">
                        −
                      </span>
                      <span className="text-base font-black">{num}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected pocket detail */}
            {selectedEntry && (
              <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 font-black text-base text-white ${pocketBg(selectedEntry.number)}`}
                    >
                      {selectedEntry.number}
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-100">
                        Pocket {selectedEntry.number}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Included by{' '}
                        <strong className="text-[#D4AF37]">
                          {selectedEntry.agreementCount}/{union.applicableTheoryCount}
                        </strong>{' '}
                        applicable theories
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPocket(null)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Per-theory contribution detail */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {selectedEntry.theories.map((t) => (
                    <div
                      key={t.methodId}
                      className="flex items-center gap-1.5 bg-[#080B12] border border-[#232D3F] rounded-lg px-2.5 py-1.5"
                    >
                      <span className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[10px] font-black border border-amber-500/20">
                        {METHOD_LABELS[t.methodId].shortName}
                      </span>
                      <span className="text-slate-300 font-semibold">{METHOD_LABELS[t.methodId].fullName}</span>
                      <span className="text-slate-500">rank #{t.rankInMethod}</span>
                    </div>
                  ))}

                  {union.applicableTheoryIds
                    .filter((id) => !selectedEntry.theories.some((t) => t.methodId === id))
                    .map((id) => (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 bg-[#080B12] border border-slate-700/30 rounded-lg px-2.5 py-1.5 opacity-50"
                      >
                        <span className="rounded bg-slate-800 text-slate-500 px-1.5 py-0.5 text-[10px] font-black border border-slate-700">
                          {METHOD_LABELS[id].shortName}
                        </span>
                        <span className="text-slate-600">{METHOD_LABELS[id].fullName}</span>
                        <span className="text-slate-600 italic">not selected</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Top 18 Shortlist toggle ── */}
        <div className="border-t border-[#232D3F] pt-4">
          <button
            onClick={() => setShowTop18(!showTop18)}
            className="w-full flex items-center justify-between rounded-xl bg-[#0D1219] border border-[#232D3F] px-4 py-3 hover:bg-[#161D29] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-sm font-bold text-slate-200">
                Optional: Top {Math.min(18, union.allUnionPockets.length)} by Theory Agreement
              </span>
              <span className="text-[10px] text-slate-500 italic">(experimental shortlist)</span>
            </div>
            {showTop18 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showTop18 && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-amber-950/10 border border-amber-500/20 p-3 text-[11px] text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  <strong>Experimental shortlist:</strong> The {Math.min(18, top18.length)} pockets with the highest
                  theory-agreement count. Ties broken by numeric ascending order.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {top18.map((entry, idx) => {
                  const isHit =
                    performanceStats.latestResult === 'HIT' &&
                    performanceStats.latestSpinNumber === entry.number;

                  const isAdded = !candidateDiff.isInitial && candidateDiff.added.includes(entry.number);

                  return (
                    <div key={entry.number} className="flex flex-col items-center gap-1">
                      <PocketChip
                        entry={entry}
                        applicableCount={union.applicableTheoryCount}
                        isSelected={selectedPocket === entry.number}
                        isHit={isHit}
                        isAdded={isAdded}
                        onClick={() =>
                          setSelectedPocket((prev) => (prev === entry.number ? null : entry.number))
                        }
                      />
                      <span className="text-[9px] font-bold text-slate-500">#{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Theory Contributions ── */}
        <div className="border-t border-[#232D3F] pt-4">
          <button
            onClick={() => setShowContributions(!showContributions)}
            className="w-full flex items-center justify-between rounded-xl bg-[#0D1219] border border-[#232D3F] px-4 py-3 hover:bg-[#161D29] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-slate-200">Theory Contributions</span>
              <span className="text-[10px] text-slate-500">
                — status &amp; sample sizes for all 8 strategies
              </span>
            </div>
            {showContributions
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showContributions && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#232D3F] bg-[#0D1219]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-[#232D3F]">
                    <th className="text-left py-2.5 px-4 font-bold">Strategy</th>
                    <th className="text-left py-2.5 px-3 font-bold">Status</th>
                    <th className="text-left py-2.5 px-3 font-bold">Set Size</th>
                    <th className="text-left py-2.5 px-3 font-bold">
                      {selectedPocket ? `Rank of ${selectedPocket}` : 'Select pocket →'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {METHOD_ORDER.map((methodId) => (
                    <TheoryStatusRow
                      key={methodId}
                      methodId={methodId}
                      snapshot={allMethods[methodId]}
                      selectedPocket={selectedPocket}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <Disclaimer />
    </div>
  );
};

// ─── Set Comparison Diff Bar ───────────────────────────────────────────────

const CandidateSetDiffBar: React.FC<{ diff: CandidateSetDiff }> = ({ diff }) => {
  if (diff.isInitial) {
    return (
      <div className="flex items-center gap-2 text-xs py-2 px-3.5 bg-[#080B12] rounded-xl border border-[#232D3F]">
        <Info className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-slate-400">
          Initial candidate set — no previous comparison snapshot available yet.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-2.5 px-3.5 bg-[#080B12] rounded-xl border border-[#232D3F]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-slate-300">Set Comparison:</span>
        <span className="inline-flex items-center gap-1 font-bold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
          + {diff.addedCount} Added
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-rose-300 bg-rose-950/70 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
          − {diff.removedCount} Removed
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
          {diff.unchangedCount} Unchanged
        </span>
      </div>

      <span className="text-[11px] text-slate-400 font-mono">
        {diff.hasChanges ? 'Changes detected vs previous set' : 'Exact number match'}
      </span>
    </div>
  );
};

// ─── Status Indicator Component ───────────────────────────────────────────────

const CandidateStatusIndicator: React.FC<{
  status: string;
  snapshot: CandidateSnapshotRecord | null;
  diff: CandidateSetDiff;
  isAutoModeActive: boolean;
}> = ({ status, snapshot, diff, isAutoModeActive }) => {
  const version = snapshot?.version ?? 1;
  const cutoffIndex = snapshot?.spinCutoffIndex ?? 0;
  const timestampStr = snapshot ? new Date(snapshot.timestamp).toLocaleTimeString() : '';

  if (!isAutoModeActive) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          HISTORY COLLECTION MODE
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Click "Generate Predictions" to start Auto Mode
        </span>
      </div>
    );
  }

  switch (status) {
    case 'CALCULATING':
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-amber-400" />
            CALCULATING...
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Recomputing 8 strategies...</span>
        </div>
      );

    case 'RESULT_CONFIRMED':
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            RESULT CONFIRMED
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Spin saved, preparing calculation</span>
        </div>
      );

    case 'NEXT_SPIN_READY':
      return (
        <div className="flex flex-col items-end gap-1">
          {diff.isInitial ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-slate-800 text-slate-300 border border-slate-700 shadow-md">
              <Info className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Initial candidate set — no previous comparison
            </span>
          ) : !diff.hasChanges || snapshot?.isRecalculatedUnchanged ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950/90 text-amber-300 border border-amber-500/40 shadow-md">
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400 stroke-[3]" />
              RECALCULATED — NO NUMBER CHANGES
            </span>
          ) : (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(34,197,94,0.4)] motion-safe:animate-[goldToGreenPulse_1.5s_ease-out_1]"
            >
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400 stroke-[3]" />
              SET UPDATED ✓
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            Set #{version} • Calculated after spin #{cutoffIndex} {timestampStr && `• ${timestampStr}`}
          </span>
        </div>
      );

    case 'UPDATE_FAILED':
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-rose-950 text-rose-300 border border-rose-600/50">
            <X className="w-3.5 h-3.5 mr-1 text-rose-400" />
            UPDATE FAILED
          </span>
          <span className="text-[10px] text-rose-400/80 font-mono">Calculation failed — old set preserved</span>
        </div>
      );

    case 'WAITING_FOR_RESULT':
    default:
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            WAITING FOR RESULT
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Set #{version} • Calculated after spin #{cutoffIndex}
          </span>
        </div>
      );
  }
};

// ─── Disclaimer ───────────────────────────────────────────────────────────────

const Disclaimer: React.FC = () => (
  <div className="mx-5 mb-5 rounded-xl bg-[#080B12] border border-amber-500/20 p-3 flex items-start gap-3 text-[11px] text-slate-400">
    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
    <p>
      <strong className="text-amber-300">EXPERIMENTAL DISCLAIMER:</strong> Agreement between historical
      selection strategies does not establish calibrated winning probabilities or reduce the house edge.
      Roulette spins are independent events under fair-wheel physics. These outputs are for analytical
      reference only.
    </p>
  </div>
);
