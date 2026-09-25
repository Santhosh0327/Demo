import React, { useState } from 'react';
import { TrackingMetrics, WheelType } from '../../types/roulette';
import { useRouletteStore } from '../../store/useRouletteStore';
import { SpinChip } from '../common/SpinChip';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Info,
  ShieldCheck,
  Target,
  XCircle,
} from 'lucide-react';

interface VerifiedPerformanceGroupProps {
  metrics: TrackingMetrics;
  wheelType: WheelType;
}

export const VerifiedPerformanceGroup: React.FC<VerifiedPerformanceGroupProps> = ({
  metrics,
  wheelType,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSpinIndex, setExpandedSpinIndex] = useState<number | null>(null);

  const { spins, evaluations } = useRouletteStore();

  const theoreticalBaseline = metrics.numberFairBaseline;
  const totalEvaluated = metrics.totalPredictions;
  const totalSpinsInSession = spins.length;
  const unEvaluatedCount = totalSpinsInSession - totalEvaluated;

  const toggleExpandRow = (spinIndex: number) => {
    setExpandedSpinIndex((prev) => (prev === spinIndex ? null : spinIndex));
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-[#10151F] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#161D29] border-b border-[#232D3F] hover:bg-[#1a2332] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              7. Verified Strategy Performance Tracking (Pre-Spin Forward Tests)
            </h3>
            <p className="text-[11px] text-slate-400">
              Immutable pre-spin snapshots evaluated against actual results (Zero Look-Ahead Bias)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {totalSpinsInSession} Session Spins
          </span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {totalEvaluated} Verified Pre-Spin Evaluations
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5 text-xs">
          {/* Integrity Banner */}
          <div className="rounded-xl bg-[#080B12] border border-emerald-500/30 p-3.5 flex items-start gap-3 text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <p>
                <strong className="text-emerald-300">PRE-SPIN FORWARD TEST GUARANTEE:</strong> Every evaluation uses the exact 18-candidate snapshot saved <strong className="text-amber-300">BEFORE</strong> that spin occurred. Newly generated candidate sets are never evaluated against the spin used to generate them.
              </p>
              {unEvaluatedCount > 0 && (
                <p className="text-slate-400 text-[10px]">
                  Note: First {unEvaluatedCount} spin{unEvaluatedCount !== 1 ? 's' : ''} had insufficient history (&lt;10 spins) and were excluded from prediction tracking denominator.
                </p>
              )}
            </div>
          </div>

          {totalEvaluated === 0 ? (
            <div className="text-slate-500 italic text-center py-6">
              No pre-spin predictions evaluated yet. Log additional confirmed spins to track forward-test accuracy.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Number Hit Rate */}
                <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">
                    18-Number Candidate Hit Rate
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-300">
                      {metrics.numberHitRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {metrics.numberHits} / {totalEvaluated} Hits
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-[#232D3F] pt-2 flex justify-between">
                    <span>Fair-Wheel Baseline:</span>
                    <span className="font-bold text-slate-200">{theoreticalBaseline.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Red/Black Hit Rate */}
                <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">
                    Red/Black Forward Hit Rate
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-400">
                      {metrics.categoryMetrics.redBlack.rate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {metrics.categoryMetrics.redBlack.hits} / {totalEvaluated} Hits
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-[#232D3F] pt-2 flex justify-between">
                    <span>Fair-Wheel Baseline:</span>
                    <span className="font-bold text-slate-200">
                      {metrics.categoryMetrics.redBlack.baseline.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Dozen Hit Rate */}
                <div className="rounded-xl bg-[#161D29] border border-[#232D3F] p-4 space-y-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">
                    Dozen Forward Hit Rate
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-purple-400">
                      {metrics.categoryMetrics.dozen.rate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {metrics.categoryMetrics.dozen.hits} / {totalEvaluated} Hits
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-[#232D3F] pt-2 flex justify-between">
                    <span>Fair-Wheel Baseline:</span>
                    <span className="font-bold text-slate-200">
                      {metrics.categoryMetrics.dozen.baseline.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance History Timeline Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Recent Pre-Spin Evaluation Log (Click row for Snapshot Proof)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Showing latest {Math.min(15, metrics.performanceHistory.length)} evaluations
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#232D3F]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#232D3F] text-slate-400 uppercase text-[10px] font-bold bg-[#161D29]">
                        <th className="p-2.5">Spin #</th>
                        <th className="p-2.5">Actual Result</th>
                        <th className="p-2.5">18-Number Outcome</th>
                        <th className="p-2.5">Cum. Hit Rate</th>
                        <th className="p-2.5">Fair Baseline</th>
                        <th className="p-2.5 text-right">Snapshot Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232D3F]/40 text-slate-200 bg-[#0D1219]">
                      {metrics.performanceHistory.slice(-15).reverse().map((item) => {
                        const isExpanded = expandedSpinIndex === item.spinIndex;
                        const isHit = item.hitNumber;
                        const candidates = item.candidateNumbers || [];
                        const actualNumber = item.actualNumber;
                        const numberIncluded = candidates.includes(actualNumber);

                        return (
                          <React.Fragment key={item.spinIndex}>
                            <tr
                              onClick={() => toggleExpandRow(item.spinIndex)}
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? 'bg-[#161D29]' : 'hover:bg-[#161D29]/60'
                              }`}
                            >
                              <td className="p-2.5 font-bold text-slate-300">
                                Spin #{item.spinIndex}
                              </td>
                              <td className="p-2.5">
                                <SpinChip number={item.actualNumber} size="sm" />
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                    isHit
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : item.verificationStatus === 'UNVERIFIED'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {isHit ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HIT (In 18)
                                    </>
                                  ) : item.verificationStatus === 'UNVERIFIED' ? (
                                    <>
                                      <HelpCircle className="w-3 h-3 text-amber-400" /> UNVERIFIED
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 text-rose-400" /> MISS
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-amber-300">
                                {item.cumulativeHitRate.toFixed(1)}%
                              </td>
                              <td className="p-2.5 text-slate-400">
                                {item.baselineRate.toFixed(1)}%
                              </td>
                              <td className="p-2.5 text-right text-slate-400">
                                <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400/90 hover:text-amber-300">
                                  <span>{isExpanded ? 'Hide Proof' : 'Inspect Proof'}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Audit & Proof Row */}
                            {isExpanded && (
                              <tr className="bg-[#080B12] border-t border-b border-amber-500/20">
                                <td colSpan={6} className="p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#232D3F] pb-2">
                                    <div className="flex items-center gap-2">
                                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                                      <span className="font-bold text-slate-200">
                                        Audit Proof for Spin #{item.spinIndex}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                      <span>Evaluated against: <strong className="text-amber-300">Set #{item.snapshotVersion ?? '?'}</strong></span>
                                      <span>• Saved BEFORE Spin #{item.spinIndex}</span>
                                      {item.snapshotCutoff !== undefined && (
                                        <span>• History Cutoff: {item.snapshotCutoff} spins</span>
                                      )}
                                      {item.snapshotTimestamp && (
                                        <span>• Created: {new Date(item.snapshotTimestamp).toLocaleTimeString()}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400">
                                        Exact 18 candidate numbers saved in pre-spin snapshot:
                                      </span>
                                      {numberIncluded ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                          ✓ Result {actualNumber} WAS INCLUDED in this 18-number set → HIT
                                        </span>
                                      ) : (
                                        <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                                          ✗ Result {actualNumber} WAS ABSENT from this 18-number set → MISS
                                        </span>
                                      )}
                                    </div>

                                    {candidates.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {candidates.map((num) => {
                                          const isActual = num === actualNumber;

                                          return (
                                            <span
                                              key={num}
                                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                                isActual
                                                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/50 animate-pulse'
                                                  : 'bg-slate-900 text-slate-300 border-slate-700'
                                              }`}
                                            >
                                              {num} {isActual && '✓'}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 italic text-xs">
                                        No saved candidate pockets array found for this evaluation record.
                                      </div>
                                    )}

                                    {!numberIncluded && (
                                      <div className="text-[11px] text-rose-300/90 pt-1">
                                        Winning number <strong className="font-mono text-rose-200">{actualNumber}</strong> was evaluated against this pre-spin 18-candidate snapshot and found absent. Evaluated as <strong className="text-rose-400 font-bold">MISS</strong>.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
