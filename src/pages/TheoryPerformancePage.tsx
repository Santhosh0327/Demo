import React, { useMemo, useState } from 'react';
import { useRouletteStore } from '../store/useRouletteStore';
import { CandidateMethodId } from '../utils/candidateEngineLab';
import { METHOD_ORDER } from '../utils/theoryUnion';
import { formatCurrency, isPnlConfigured } from '../utils/pnlCalculator';
import { getPocketColor } from '../utils/rouletteRules';
import {
  TheoryEvaluationRecord,
  TheoryPerformanceStats,
  TheorySnapshotRecord,
} from '../types/theoryPerformance';
import {
  Target,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  DollarSign,
  Info,
} from 'lucide-react';

export const TheoryPerformancePage: React.FC = () => {
  const {
    spins,
    wheelType,
    isAutoModeActive,
    theoryStats,
    theoryEvaluations,
    pnlConfig,
  } = useRouletteStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'hits' | 'rate' | 'spins' | 'name'>('hits');
  const [equalCoverageOnly, setEqualCoverageOnly] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState<CandidateMethodId | null>(null);
  const [selectedLogEval, setSelectedLogEval] = useState<TheoryEvaluationRecord | null>(null);

  const allTheoryList: TheoryPerformanceStats[] = useMemo(() => {
    return METHOD_ORDER.map((m) => theoryStats[m]).filter(Boolean);
  }, [theoryStats]);

  // Filter and sort theory list
  const filteredAndSortedTheories = useMemo(() => {
    let list = [...allTheoryList];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.methodName.toLowerCase().includes(q) ||
          t.shortName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Filter equal coverage if enabled
    if (equalCoverageOnly) {
      list = list.filter((t) => t.candidateCount === 18);
    }

    // Sort list
    list.sort((a, b) => {
      switch (sortField) {
        case 'hits':
          return b.totalHits - a.totalHits;
        case 'rate':
          return b.hitRatePercentage - a.hitRatePercentage;
        case 'spins':
          return b.evaluatedSpins - a.evaluatedSpins;
        case 'name':
          return a.methodName.localeCompare(b.methodName);
        default:
          return b.totalHits - a.totalHits;
      }
    });

    return list;
  }, [allTheoryList, searchQuery, equalCoverageOnly, sortField]);

  const toggleExpand = (methodId: CandidateMethodId) => {
    setExpandedMethod((prev) => (prev === methodId ? null : methodId));
    setSelectedLogEval(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── HEADER & DISCLAIMER ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide text-slate-100 flex items-center gap-2">
                THEORY PERFORMANCE <span className="text-[#D4AF37]">ANALYTICS</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed historical candidate coverage for all 8 mathematical theories calculated strictly against pre-spin snapshots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl border border-[#232D3F] bg-[#0D1219] text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="text-slate-400">Wheel:</span>
              <span className="font-bold text-[#D4AF37]">{wheelType} Roulette</span>
            </div>

            <div
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                isAutoModeActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isAutoModeActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isAutoModeActive ? 'AUTO MODE ACTIVE' : 'WAITING FOR GENERATE'}
            </div>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Non-Predictive Historical Notice:</strong> Theory performance represents empirical hit history of candidate numbers generated prior to each spin. Standard fair roulette spins are independent events. High observed hit rates reflect past sample coverage and do not establish future winning forecasts.
          </span>
        </div>
      </div>

      {/* ── CONTROLS & FILTERS BAR ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#232D3F] bg-[#10151F] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search theories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0D1219] border border-[#232D3F] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>

        {/* Sort & Equal Coverage Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Equal Coverage Filter */}
          <button
            onClick={() => setEqualCoverageOnly(!equalCoverageOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              equalCoverageOnly
                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]'
                : 'bg-[#0D1219] border-[#232D3F] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Compare Equal Coverage (18 Pockets)</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-[#0D1219] border border-[#232D3F] rounded-xl px-3 py-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="text-[11px] text-slate-400 font-medium">Order:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="hits" className="bg-[#10151F]">Sorted by observed hits</option>
              <option value="rate" className="bg-[#10151F]">Sort by hit rate (%)</option>
              <option value="spins" className="bg-[#10151F]">Sort by evaluated spins</option>
              <option value="name" className="bg-[#10151F]">Sort by theory name</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN PERFORMANCE TABLE ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] shadow-xl overflow-hidden">
        {filteredAndSortedTheories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="font-bold text-sm text-slate-300">Insufficient comparable records</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {equalCoverageOnly
                ? 'No theories currently match the exact 18-pocket equal coverage filter.'
                : 'No theories match your current search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232D3F] bg-[#0D1219] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Theory Strategy</th>
                  <th className="py-3.5 px-4">Candidate Set</th>
                  <th className="py-3.5 px-4 text-center">Evaluated</th>
                  <th className="py-3.5 px-4 text-center">Hits / Misses</th>
                  <th className="py-3.5 px-4 text-right">Hit Rate %</th>
                  <th className="py-3.5 px-4 text-center">Streaks</th>
                  <th className="py-3.5 px-4 text-center">Latest Result</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232D3F]/60">
                {filteredAndSortedTheories.map((theory) => {
                  const isExpanded = expandedMethod === theory.methodId;
                  const diff = theory.coverageDiffPct;
                  const isPositiveDiff = diff > 0;

                  return (
                    <React.Fragment key={theory.methodId}>
                      {/* Main Table Row */}
                      <tr
                        onClick={() => toggleExpand(theory.methodId)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-[#161D29]'
                            : 'hover:bg-[#161D29]/50'
                        }`}
                      >
                        {/* Theory Name & Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-mono font-bold text-[#D4AF37]">
                              {theory.shortName}
                            </span>
                            <div>
                              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                {theory.methodName}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">
                                {theory.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Candidate Set Count & Theoretical Base */}
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-slate-200">
                            {theory.candidateCount} pockets
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Base: {theory.theoreticalCoveragePct.toFixed(2)}% ({wheelType})
                          </div>
                        </td>

                        {/* Evaluated Spins */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-300">
                          {theory.evaluatedSpins}
                        </td>

                        {/* Hits / Misses */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2 font-mono font-bold text-xs">
                            <span className="text-emerald-400">{theory.totalHits} H</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-rose-400">{theory.totalMisses} M</span>
                          </div>
                        </td>

                        {/* Hit Rate % & Coverage Diff */}
                        <td className="py-4 px-4 text-right">
                          <div className="font-mono font-black text-sm text-[#D4AF37]">
                            {theory.hitRatePercentage.toFixed(1)}%
                          </div>
                          <div
                            className={`text-[10px] font-mono inline-flex items-center gap-0.5 font-semibold ${
                              isPositiveDiff ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {isPositiveDiff ? '+' : ''}
                            {diff.toFixed(1)}% vs base
                          </div>
                        </td>

                        {/* Streaks */}
                        <td className="py-4 px-4 text-center">
                          <div className="text-[11px] font-mono">
                            <span className="text-slate-300">Current: </span>
                            <span className="font-bold text-emerald-400">{theory.currentStreak}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Best: {theory.longestStreak}
                          </div>
                        </td>

                        {/* Latest Result */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {theory.latestOutcome === 'HIT' && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[10px] font-black tracking-wide flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> HIT
                              </span>
                            )}
                            {theory.latestOutcome === 'MISS' && (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-400 text-[10px] font-black tracking-wide flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> MISS
                              </span>
                            )}
                            {theory.latestOutcome === 'NOT_EVALUATED' && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
                                UN-EVALUATED
                              </span>
                            )}
                            {theory.latestWinningNumber && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Spin pocket: <strong className="text-slate-200">{theory.latestWinningNumber}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Expand Button */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(theory.methodId);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-[#D4AF37]" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Theory Detail Panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0 border-b border-[#232D3F] bg-[#0A0E17]">
                            <TheoryDetailPanel
                              theory={theory}
                              evaluations={theoryEvaluations[theory.methodId] || []}
                              selectedLogEval={selectedLogEval}
                              setSelectedLogEval={setSelectedLogEval}
                              currency={pnlConfig.currency}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── HYPOTHETICAL P&L BY THEORY OVERVIEW SECTION ──────────────────────── */}
      <div className="rounded-2xl border border-[#232D3F] bg-[#10151F] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#232D3F] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-slate-100 flex items-center gap-2">
                HYPOTHETICAL P&L <span className="text-emerald-400">BY THEORY</span>
              </h2>
              <p className="text-xs text-slate-400">
                Independent performance breakdown calculated using each theory's exact saved pre-spin candidate set and configured stakes.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            Saved Pre-Spin Stakes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allTheoryList.map((t) => {
            const pnl = t.pnlSummary;
            const configured = isPnlConfigured(pnlConfig);
            const cumPnl = pnl?.cumulativePnl ?? 0;
            const isPositive = cumPnl > 0;
            const isNegative = cumPnl < 0;

            return (
              <div
                key={t.methodId}
                className="rounded-xl border border-[#232D3F] bg-[#0D1219] p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono font-bold text-[10px]">
                      {t.shortName}
                    </span>
                    <span className="font-bold text-xs text-slate-200 line-clamp-1">{t.methodName}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Cumulative P&amp;L</div>
                  <div
                    className={`text-lg font-black font-mono mt-0.5 ${
                      !configured || t.evaluatedSpins === 0
                        ? 'text-slate-400 font-normal text-sm'
                        : isPositive
                        ? 'text-emerald-400'
                        : isNegative
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {configured
                      ? t.evaluatedSpins > 0
                        ? formatCurrency(cumPnl, pnlConfig.currency)
                        : 'Not evaluated'
                      : 'Not configured'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232D3F]/60 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 block">Bankroll</span>
                    <span className="font-bold text-slate-200">
                      {configured
                        ? formatCurrency(pnl?.currentBankroll ?? pnlConfig.startingBankroll ?? 0, pnlConfig.currency)
                        : 'Not configured'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Evaluated Spins</span>
                    <span className="font-bold text-slate-200">{t.evaluatedSpins}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── EXPANDABLE DETAIL PANEL COMPONENT ───────────────────────────────────────

interface TheoryDetailPanelProps {
  theory: TheoryPerformanceStats;
  evaluations: TheoryEvaluationRecord[];
  selectedLogEval: TheoryEvaluationRecord | null;
  setSelectedLogEval: (ev: TheoryEvaluationRecord | null) => void;
  currency: string;
}

const TheoryDetailPanel: React.FC<TheoryDetailPanelProps> = ({
  theory,
  evaluations,
  selectedLogEval,
  setSelectedLogEval,
  currency,
}) => {
  const preSpinSnap = theory.latestPreSpinSnapshot;
  const postSpinSnap = theory.latestPostSpinSnapshot;

  const preSpinNumbers = useMemo(() => preSpinSnap?.candidateNumbers || [], [preSpinSnap]);
  const postSpinNumbers = useMemo(() => postSpinSnap?.candidateNumbers || [], [postSpinSnap]);

  // Added/Removed diff between Pre-Spin and Next-Spin sets
  const addedNumbers = useMemo(() => {
    return postSpinNumbers.filter((n) => !preSpinNumbers.includes(n));
  }, [preSpinNumbers, postSpinNumbers]);

  const removedNumbers = useMemo(() => {
    return preSpinNumbers.filter((n) => !postSpinNumbers.includes(n));
  }, [preSpinNumbers, postSpinNumbers]);

  const latestWinningPocket = theory.latestWinningNumber;
  const isWinningPocketCovered = latestWinningPocket ? preSpinNumbers.includes(latestWinningPocket) : false;

  return (
    <div className="p-6 space-y-6">
      {/* ── SUB-SECTION A: PRE-SPIN VS NEXT-SPIN CANDIDATE COMPARISON ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PRE-SPIN SNAPSHOT (Saved BEFORE Latest Evaluated Spin) */}
        <div className="rounded-xl border border-amber-500/30 bg-[#0F141F] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#D4AF37]" />
              <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wide">
                Pre-Spin Candidate Set <span className="text-[#D4AF37]">(Saved BEFORE Spin)</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Cutoff #{preSpinSnap?.spinCutoffIndex ?? 0}
            </span>
          </div>

          {preSpinNumbers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No pre-spin snapshot generated yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {preSpinNumbers.map((num) => {
                  const isWinning = num === latestWinningPocket;
                  const color = getPocketColor(num);
                  return (
                    <div
                      key={num}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all ${
                        isWinning
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.8)] ring-2 ring-emerald-300 scale-110'
                          : color === 'red'
                          ? 'bg-rose-950/60 border border-rose-700/50 text-rose-200'
                          : color === 'black'
                          ? 'bg-slate-900 border border-slate-700 text-slate-200'
                          : 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              {latestWinningPocket && (
                <div className="pt-2 border-t border-[#232D3F] flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Actual Spin Outcome:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                      isWinningPocketCovered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    Pocket {latestWinningPocket} ({isWinningPocketCovered ? 'HIT ✓' : 'MISS ✗'})
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* NEXT-SPIN SNAPSHOT (Generated AFTER Spin) */}
        <div className="rounded-xl border border-[#232D3F] bg-[#0F141F] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wide">
                Next-Spin Set <span className="text-emerald-400">(Generated AFTER Spin)</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Cutoff #{postSpinSnap?.spinCutoffIndex ?? 0}
            </span>
          </div>

          {postSpinNumbers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No post-spin snapshot generated yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {postSpinNumbers.map((num) => {
                  const isAdded = addedNumbers.includes(num);
                  return (
                    <div
                      key={num}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all ${
                        isAdded
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              {/* Added / Removed Rows */}
              <div className="pt-2 border-t border-[#232D3F] space-y-1 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 font-mono">
                  <span className="font-bold text-xs">(+) Added:</span>
                  <span>{addedNumbers.length > 0 ? addedNumbers.join(', ') : 'None'}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-400 font-mono">
                  <span className="font-bold text-xs">(−) Removed:</span>
                  <span>{removedNumbers.length > 0 ? removedNumbers.join(', ') : 'None'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SUB-SECTION B: INDIVIDUAL EVALUATION LOG ───────────────────────── */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#D4AF37]" />
          Individual Evaluation Log ({evaluations.length} Spins)
        </h3>

        {evaluations.length === 0 ? (
          <div className="p-6 rounded-xl border border-[#232D3F] bg-[#0F141F] text-center text-xs text-slate-500 italic">
            No verified evaluation logs recorded yet for this strategy. Activate Auto Mode and enter confirmed spins to generate records.
          </div>
        ) : (
          <div className="rounded-xl border border-[#232D3F] bg-[#0F141F] overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#232D3F] bg-[#0D1219] text-slate-400 text-[10px] uppercase font-bold sticky top-0">
                    <th className="py-2.5 px-3">Spin #</th>
                    <th className="py-2.5 px-3">Actual Number</th>
                    <th className="py-2.5 px-3">Pre-Spin Candidates</th>
                    <th className="py-2.5 px-3 text-center">Outcome</th>
                    <th className="py-2.5 px-3 text-right">Running Hits</th>
                    <th className="py-2.5 px-3 text-right">Hit Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232D3F]/60 text-slate-300">
                  {[...evaluations].reverse().map((ev) => {
                    const isSelected = selectedLogEval?.id === ev.id;
                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedLogEval(isSelected ? null : ev)}
                        className={`cursor-pointer transition-colors hover:bg-slate-800/40 ${
                          isSelected ? 'bg-[#161D29]' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-200">#{ev.spinIndex}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded">
                            {ev.spinNumber}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                          {ev.candidateNumbers.join(', ')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {ev.result === 'HIT' ? (
                            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              HIT ✓
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                              MISS ✗
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-300">
                          {ev.runningHits} / {ev.runningTotal}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#D4AF37]">
                          {ev.runningHitRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Log Modal/Drawer */}
            {selectedLogEval && (
              <div className="p-4 bg-[#141A26] border-t border-[#232D3F] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-200 font-bold">
                  <span>Detailed Pre-Spin Snapshot for Spin #{selectedLogEval.spinIndex}</span>
                  <button
                    onClick={() => setSelectedLogEval(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Close
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  Winning Number: <strong className="text-slate-100">{selectedLogEval.spinNumber}</strong> | Outcome:{' '}
                  <strong className={selectedLogEval.result === 'HIT' ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedLogEval.result}
                  </strong>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLogEval.candidateNumbers.map((num) => (
                    <span
                      key={num}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        num === selectedLogEval.spinNumber
                          ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300'
                          : 'bg-slate-900 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
