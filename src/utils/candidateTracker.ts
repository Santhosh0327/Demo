import { CandidateSnapshotRecord, ConsolidatedEvaluationRecord, ConsolidatedPerformanceStats, EvaluationResult, EvaluationTargetFilter, PnlConfig, SpinItem, WheelType } from '../types/roulette';
import { computeAllCandidateMethods } from './candidateEngineLab';
import { buildTheoryUnion, applyUnionFilter, extractFilterNumbers } from './theoryUnion';
import { computePnlSnapshotData, evaluatePnlForSpin, computePnlSummaryStats, DEFAULT_PNL_CONFIG } from './pnlCalculator';

/**
 * Extracts target number array from candidate filter set.
 */
export function getNumbersForFilter(
  filterNumbers: {
    all: string[];
    min2: string[];
    min4: string[];
    all_applicable: string[];
    top18: string[];
  },
  targetFilter: EvaluationTargetFilter = 'top18'
): string[] {
  switch (targetFilter) {
    case 'all':
      return filterNumbers.all;
    case 'min2':
      return filterNumbers.min2;
    case 'min4':
      return filterNumbers.min4;
    case 'all_applicable':
      return filterNumbers.all_applicable;
    case 'top18':
    default:
      return filterNumbers.top18;
  }
}

/**
 * Builds an immutable candidate snapshot for a session at a specific spin cutoff.
 */
export function computeCandidateSnapshot(
  sessionId: string,
  spins: SpinItem[],
  wheelType: WheelType,
  targetFilter: EvaluationTargetFilter = 'top18',
  previousSnapshot?: CandidateSnapshotRecord | null,
  pnlConfig?: PnlConfig
): CandidateSnapshotRecord {
  const cutoffIndex = spins.length;
  const cutoffId = spins.length > 0 ? spins[spins.length - 1].id : null;
  const timestamp = Date.now();

  const allMethods = computeAllCandidateMethods(spins, wheelType);
  const unionResult = buildTheoryUnion(allMethods, wheelType);
  const filterNumbers = extractFilterNumbers(
    unionResult.allUnionPockets,
    unionResult.applicableTheoryCount
  );
  const targetNumbers = getNumbersForFilter(filterNumbers, targetFilter);

  // Check if candidate set changed compared to previous snapshot
  let isRecalculatedUnchanged = false;
  if (previousSnapshot && previousSnapshot.targetNumbers && previousSnapshot.targetNumbers.length > 0) {
    const prevSorted = [...previousSnapshot.targetNumbers].sort().join(',');
    const currSorted = [...targetNumbers].sort().join(',');
    if (prevSorted === currSorted && targetNumbers.length > 0) {
      isRecalculatedUnchanged = true;
    }
  }

  const newVersion = previousSnapshot ? previousSnapshot.version + 1 : 1;
  const id = `snap_${sessionId}_v${newVersion}_cut${cutoffIndex}`;

  const activePnlConfig = pnlConfig || previousSnapshot?.pnlData?.config || DEFAULT_PNL_CONFIG;
  const pnlData = computePnlSnapshotData(targetNumbers, activePnlConfig, wheelType);

  return {
    id,
    sessionId,
    version: newVersion,
    spinCutoffIndex: cutoffIndex,
    spinCutoffId: cutoffId,
    timestamp,
    allUnionNumbers: filterNumbers.all,
    filterNumbers,
    targetFilter,
    targetNumbers,
    targetSetSize: targetNumbers.length,
    isRecalculatedUnchanged,
    pnlData,
  };
}

/**
 * Evaluates a single spin result against a pre-spin candidate snapshot with strict proof checks.
 */
export function evaluateSpinAgainstSnapshot(
  spin: SpinItem,
  spinIndex: number,
  snapshot: CandidateSnapshotRecord | null,
  prevCurrentStreak: number,
  prevLongestStreak: number,
  prevCumulativePnl: number = 0
): ConsolidatedEvaluationRecord {
  // Guard 1: Missing or insufficient pre-spin snapshot (< 10 spins history)
  if (!snapshot || !snapshot.targetNumbers || snapshot.targetNumbers.length === 0) {
    return {
      id: `eval_${spin.id}`,
      sessionId: spin.sessionId,
      spinId: spin.id,
      spinNumber: spin.number,
      spinIndex,
      snapshotId: snapshot ? snapshot.id : null,
      snapshotVersion: snapshot ? snapshot.version : null,
      snapshotCutoff: snapshot ? snapshot.spinCutoffIndex : 0,
      snapshotTimestamp: snapshot ? snapshot.timestamp : 0,
      evaluatedFilter: snapshot ? snapshot.targetFilter : null,
      evaluatedNumbers: [],
      evaluatedSetSize: 0,
      result: 'NOT_EVALUATED',
      verificationStatus: 'NOT_EVALUATED',
      currentStreak: prevCurrentStreak,
      longestStreak: prevLongestStreak,
      timestamp: spin.timestamp,
      pnlRecord: null,
    };
  }

  // Guard 2: Mismatched snapshot cutoff index
  if (snapshot.spinCutoffIndex !== spinIndex - 1) {
    console.warn(
      `[evaluateSpinAgainstSnapshot] Mismatched snapshot cutoff! Spin #${spinIndex} evaluated against snapshot with cutoff #${snapshot.spinCutoffIndex}. Marking UNVERIFIED.`
    );

    return {
      id: `eval_${spin.id}`,
      sessionId: spin.sessionId,
      spinId: spin.id,
      spinNumber: spin.number,
      spinIndex,
      snapshotId: snapshot.id,
      snapshotVersion: snapshot.version,
      snapshotCutoff: snapshot.spinCutoffIndex,
      snapshotTimestamp: snapshot.timestamp,
      evaluatedFilter: snapshot.targetFilter,
      evaluatedNumbers: [...snapshot.targetNumbers],
      evaluatedSetSize: snapshot.targetNumbers.length,
      result: 'UNVERIFIED',
      verificationStatus: 'UNVERIFIED',
      currentStreak: prevCurrentStreak,
      longestStreak: prevLongestStreak,
      timestamp: spin.timestamp,
      pnlRecord: null,
    };
  }

  // Strict pocket membership check: exact string equality ('0' !== '00')
  const isHit = snapshot.targetNumbers.some((n) => n === spin.number);
  const result: EvaluationResult = isHit ? 'HIT' : 'MISS';
  const verificationStatus = isHit ? 'VERIFIED_HIT' : 'VERIFIED_MISS';

  const currentStreak = isHit ? prevCurrentStreak + 1 : 0;
  const longestStreak = Math.max(prevLongestStreak, currentStreak);

  // Compute P&L record from saved snapshot configuration
  const startingBankroll = snapshot.pnlData?.config?.startingBankroll || 10000;
  const pnlRecord = evaluatePnlForSpin(spin, spinIndex, snapshot, prevCumulativePnl, startingBankroll);

  return {
    id: `eval_${spin.id}`,
    sessionId: spin.sessionId,
    spinId: spin.id,
    spinNumber: spin.number,
    spinIndex,
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    snapshotCutoff: snapshot.spinCutoffIndex,
    snapshotTimestamp: snapshot.timestamp,
    evaluatedFilter: snapshot.targetFilter,
    evaluatedNumbers: [...snapshot.targetNumbers],
    evaluatedSetSize: snapshot.targetNumbers.length,
    result,
    verificationStatus,
    currentStreak,
    longestStreak,
    timestamp: spin.timestamp,
    pnlRecord,
  };
}

/**
 * Chronologically recomputes all candidate snapshots, evaluation events, and consecutive hit streaks
 * for a session. Used when history is initialized, edited, undone, or cleared.
 */
export function recomputeSessionHistory(
  sessionId: string,
  spins: SpinItem[],
  wheelType: WheelType,
  targetFilter: EvaluationTargetFilter = 'top18',
  isAutoModeActive: boolean = true,
  activationCutoffIndex?: number,
  pnlConfig?: PnlConfig
): {
  snapshots: CandidateSnapshotRecord[];
  evaluations: ConsolidatedEvaluationRecord[];
  performanceStats: ConsolidatedPerformanceStats;
  latestSnapshot: CandidateSnapshotRecord | null;
  previousSnapshot: CandidateSnapshotRecord | null;
} {
  const snapshots: CandidateSnapshotRecord[] = [];
  const evaluations: ConsolidatedEvaluationRecord[] = [];
  const activePnlConfig = pnlConfig || DEFAULT_PNL_CONFIG;

  let currentStreak = 0;
  let longestStreak = 0;
  let prevCumulativePnl = 0;

  // If predictions have NOT been activated for this session yet, return empty prediction snapshots & evaluations
  if (!isAutoModeActive) {
    const emptyStats: ConsolidatedPerformanceStats = {
      latestSpinNumber: spins.length > 0 ? spins[spins.length - 1].number : null,
      latestResult: 'NOT_EVALUATED',
      currentStreak: 0,
      longestStreak: 0,
      totalEvaluatedSpins: 0,
      totalHits: 0,
      totalMisses: 0,
      totalUnverified: 0,
      hitRatePercentage: 0,
      latestEvaluatedVersion: null,
      latestEvaluatedSetSize: 0,
      latestEvaluatedFilter: null,
      pnlSummary: computePnlSummaryStats([], activePnlConfig),
    };

    return {
      snapshots: [],
      evaluations: [],
      performanceStats: emptyStats,
      latestSnapshot: null,
      previousSnapshot: null,
    };
  }

  // Auto mode IS active: compute activation cutoff
  const startCutoff = activationCutoffIndex ?? 0;

  // Initial snapshot created at activation moment (using spins prior to startCutoff)
  let currentSnapshot = computeCandidateSnapshot(
    sessionId,
    spins.slice(0, startCutoff),
    wheelType,
    targetFilter,
    null,
    activePnlConfig
  );
  snapshots.push(currentSnapshot);

  for (let i = startCutoff; i < spins.length; i++) {
    const spin = spins[i];
    const spinIndex = i + 1;

    // 1. Evaluate spin against pre-spin snapshot
    const evalRecord = evaluateSpinAgainstSnapshot(
      spin,
      spinIndex,
      currentSnapshot,
      currentStreak,
      longestStreak,
      prevCumulativePnl
    );

    evaluations.push(evalRecord);

    currentStreak = evalRecord.currentStreak;
    longestStreak = evalRecord.longestStreak;
    if (evalRecord.pnlRecord) {
      prevCumulativePnl = evalRecord.pnlRecord.cumulativePnl;
    }

    // 2. Compute post-spin snapshot for upcoming spin
    const historySoFar = spins.slice(0, i + 1);
    currentSnapshot = computeCandidateSnapshot(
      sessionId,
      historySoFar,
      wheelType,
      targetFilter,
      currentSnapshot,
      activePnlConfig
    );
    snapshots.push(currentSnapshot);
  }

  // Calculate summary stats excluding NOT_EVALUATED and UNVERIFIED from accuracy denominator
  const evaluatedRecords = evaluations.filter(
    (e) => e.result === 'HIT' || e.result === 'MISS'
  );
  const totalHits = evaluations.filter((e) => e.result === 'HIT').length;
  const totalMisses = evaluations.filter((e) => e.result === 'MISS').length;
  const totalUnverified = evaluations.filter((e) => e.result === 'UNVERIFIED').length;

  const totalEvaluatedSpins = evaluatedRecords.length;
  const hitRatePercentage = totalEvaluatedSpins > 0 ? (totalHits / totalEvaluatedSpins) * 100 : 0;

  const lastEval = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

  const pnlRecords = evaluations.map((e) => e.pnlRecord).filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);
  const pnlSummary = computePnlSummaryStats(pnlRecords, activePnlConfig);

  const performanceStats: ConsolidatedPerformanceStats = {
    latestSpinNumber: spins.length > 0 ? spins[spins.length - 1].number : null,
    latestResult: lastEval ? lastEval.result : 'NOT_EVALUATED',
    currentStreak,
    longestStreak,
    totalEvaluatedSpins,
    totalHits,
    totalMisses,
    totalUnverified,
    hitRatePercentage,
    latestEvaluatedVersion: lastEval ? lastEval.snapshotVersion : null,
    latestEvaluatedSetSize: lastEval ? lastEval.evaluatedSetSize : 0,
    latestEvaluatedFilter: lastEval ? lastEval.evaluatedFilter : null,
    pnlSummary,
  };

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previousSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  return {
    snapshots,
    evaluations,
    performanceStats,
    latestSnapshot,
    previousSnapshot,
  };
}
