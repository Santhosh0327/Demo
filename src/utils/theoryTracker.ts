import {
  CandidateMethodId,
  computeAllCandidateMethods,
} from './candidateEngineLab';
import {
  computePnlSnapshotData,
  evaluatePnlForSpin,
  computePnlSummaryStats,
  DEFAULT_PNL_CONFIG,
} from './pnlCalculator';
import { METHOD_LABELS, METHOD_ORDER } from './theoryUnion';
import { PnlConfig, SpinItem, WheelType } from '../types/roulette';
import {
  TheoryEvaluationRecord,
  TheoryOutcomeResult,
  TheoryPerformanceStats,
  TheorySnapshotRecord,
} from '../types/theoryPerformance';

/**
 * Computes theoretical coverage baseline % for a given candidate count and wheel type.
 * EU: count / 37 * 100
 * US: count / 38 * 100
 */
export function calculateTheoreticalCoverage(candidateCount: number, wheelType: WheelType): number {
  const totalPockets = wheelType === 'American' ? 38 : 37;
  if (candidateCount <= 0 || candidateCount > totalPockets) return 0;
  return (candidateCount / totalPockets) * 100;
}

/**
 * Builds individual theory candidate snapshot for a specific cutoff.
 */
export function computeTheorySnapshotsForCutoff(
  sessionId: string,
  spins: SpinItem[],
  wheelType: WheelType,
  pnlConfig?: PnlConfig,
  prevSnapshotsByMethod?: Record<string, TheorySnapshotRecord>
): Record<CandidateMethodId, TheorySnapshotRecord> {
  const cutoffIndex = spins.length;
  const cutoffId = spins.length > 0 ? spins[spins.length - 1].id : null;
  const timestamp = Date.now();
  const activePnlConfig = pnlConfig || DEFAULT_PNL_CONFIG;

  const allMethods = computeAllCandidateMethods(spins, wheelType, sessionId);
  const result: Partial<Record<CandidateMethodId, TheorySnapshotRecord>> = {};

  METHOD_ORDER.forEach((methodId) => {
    const rawSnap = allMethods[methodId];
    const selectedNumbers = rawSnap ? rawSnap.selectedNumbers : [];
    const prevSnap = prevSnapshotsByMethod ? prevSnapshotsByMethod[methodId] : null;
    const version = prevSnap ? prevSnap.version + 1 : 1;

    const snapshotId = `theory_snap_${sessionId}_${methodId}_v${version}_cut${cutoffIndex}`;
    const pnlData = computePnlSnapshotData(selectedNumbers, activePnlConfig, wheelType);
    const meta = METHOD_LABELS[methodId];

    result[methodId] = {
      id: snapshotId,
      sessionId,
      methodId,
      methodName: meta ? meta.fullName : methodId,
      version,
      spinCutoffIndex: cutoffIndex,
      spinCutoffId: cutoffId,
      timestamp,
      candidateNumbers: selectedNumbers,
      candidateCount: selectedNumbers.length,
      historyCutoff: rawSnap ? rawSnap.historyCutoff : spins.length,
      isSufficientData: rawSnap ? rawSnap.isSufficientData : false,
      pnlData,
    };
  });

  return result as Record<CandidateMethodId, TheorySnapshotRecord>;
}

/**
 * Evaluates a single spin result against a theory's pre-spin candidate snapshot.
 */
export function evaluateSpinAgainstTheorySnapshot(
  spin: SpinItem,
  spinIndex: number,
  snapshot: TheorySnapshotRecord | null,
  prevCurrentStreak: number,
  prevLongestStreak: number,
  prevRunningHits: number,
  prevRunningTotal: number,
  prevCumulativePnl: number = 0
): TheoryEvaluationRecord {
  // Guard: missing or empty snapshot
  if (!snapshot || !snapshot.candidateNumbers || snapshot.candidateNumbers.length === 0) {
    return {
      id: `theory_eval_${snapshot?.methodId || 'unknown'}_${spin.id}`,
      sessionId: spin.sessionId,
      methodId: snapshot ? snapshot.methodId : 'frequency',
      spinId: spin.id,
      spinNumber: spin.number,
      spinIndex,
      snapshotId: snapshot ? snapshot.id : 'none',
      snapshotVersion: snapshot ? snapshot.version : 0,
      snapshotCutoff: snapshot ? snapshot.spinCutoffIndex : 0,
      snapshotTimestamp: snapshot ? snapshot.timestamp : 0,
      candidateNumbers: [],
      candidateCount: 0,
      result: 'NOT_EVALUATED',
      currentStreak: prevCurrentStreak,
      longestStreak: prevLongestStreak,
      timestamp: spin.timestamp,
      runningHits: prevRunningHits,
      runningTotal: prevRunningTotal,
      runningHitRate: prevRunningTotal > 0 ? (prevRunningHits / prevRunningTotal) * 100 : 0,
      pnlRecord: null,
    };
  }

  const isHit = snapshot.candidateNumbers.includes(spin.number);
  const result: TheoryOutcomeResult = isHit ? 'HIT' : 'MISS';

  const currentStreak = isHit ? prevCurrentStreak + 1 : 0;
  const longestStreak = Math.max(prevLongestStreak, currentStreak);
  const runningHits = isHit ? prevRunningHits + 1 : prevRunningHits;
  const runningTotal = prevRunningTotal + 1;
  const runningHitRate = (runningHits / runningTotal) * 100;

  const startingBankroll = snapshot.pnlData?.config?.startingBankroll || 10000;
  const mockConsolidatedSnapshot = {
    id: snapshot.id,
    sessionId: snapshot.sessionId,
    version: snapshot.version,
    spinCutoffIndex: snapshot.spinCutoffIndex,
    spinCutoffId: snapshot.spinCutoffId,
    timestamp: snapshot.timestamp,
    allUnionNumbers: snapshot.candidateNumbers,
    filterNumbers: { all: snapshot.candidateNumbers, min2: [], min4: [], all_applicable: [], top18: snapshot.candidateNumbers },
    targetFilter: 'top18' as const,
    targetNumbers: snapshot.candidateNumbers,
    targetSetSize: snapshot.candidateCount,
    pnlData: snapshot.pnlData,
  };

  const pnlRecord = evaluatePnlForSpin(spin, spinIndex, mockConsolidatedSnapshot, prevCumulativePnl, startingBankroll);

  return {
    id: `theory_eval_${snapshot.methodId}_${spin.id}`,
    sessionId: spin.sessionId,
    methodId: snapshot.methodId,
    spinId: spin.id,
    spinNumber: spin.number,
    spinIndex,
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    snapshotCutoff: snapshot.spinCutoffIndex,
    snapshotTimestamp: snapshot.timestamp,
    candidateNumbers: [...snapshot.candidateNumbers],
    candidateCount: snapshot.candidateCount,
    result,
    currentStreak,
    longestStreak,
    timestamp: spin.timestamp,
    runningHits,
    runningTotal,
    runningHitRate,
    pnlRecord,
  };
}

/**
 * Recomputes theory performance history across all 8 mathematical methods.
 */
export function recomputeTheorySessionHistory(
  sessionId: string,
  spins: SpinItem[],
  wheelType: WheelType,
  isAutoModeActive: boolean,
  activationCutoffIndex: number = 0,
  pnlConfig?: PnlConfig
): {
  theorySnapshots: Record<CandidateMethodId, TheorySnapshotRecord[]>;
  theoryEvaluations: Record<CandidateMethodId, TheoryEvaluationRecord[]>;
  theoryStats: Record<CandidateMethodId, TheoryPerformanceStats>;
} {
  const activePnlConfig = pnlConfig || DEFAULT_PNL_CONFIG;

  const theorySnapshots: Record<CandidateMethodId, TheorySnapshotRecord[]> = {
    frequency: [],
    recency: [],
    transition: [],
    wheel_neighbour: [],
    opposite_pocket: [],
    sector: [],
    bayesian: [],
    weighted_ensemble: [],
  };

  const theoryEvaluations: Record<CandidateMethodId, TheoryEvaluationRecord[]> = {
    frequency: [],
    recency: [],
    transition: [],
    wheel_neighbour: [],
    opposite_pocket: [],
    sector: [],
    bayesian: [],
    weighted_ensemble: [],
  };

  const theoryStats: Partial<Record<CandidateMethodId, TheoryPerformanceStats>> = {};

  // If predictions NOT active, return empty snapshots & default stats for all 8 theories
  if (!isAutoModeActive) {
    METHOD_ORDER.forEach((methodId) => {
      const meta = METHOD_LABELS[methodId];
      theoryStats[methodId] = {
        methodId,
        methodName: meta ? meta.fullName : methodId,
        shortName: meta ? meta.shortName : methodId,
        description: meta ? meta.description : '',
        candidateCount: 18,
        evaluatedSpins: 0,
        totalHits: 0,
        totalMisses: 0,
        hitRatePercentage: 0,
        theoreticalCoveragePct: calculateTheoreticalCoverage(18, wheelType),
        coverageDiffPct: 0,
        currentStreak: 0,
        longestStreak: 0,
        latestWinningNumber: spins.length > 0 ? spins[spins.length - 1].number : null,
        latestOutcome: 'NOT_EVALUATED',
        latestTimestamp: Date.now(),
        latestPreSpinSnapshot: null,
        latestPostSpinSnapshot: null,
        pnlSummary: computePnlSummaryStats([], activePnlConfig),
      };
    });

    return {
      theorySnapshots,
      theoryEvaluations,
      theoryStats: theoryStats as Record<CandidateMethodId, TheoryPerformanceStats>,
    };
  }

  const startCutoff = activationCutoffIndex ?? 0;
  let currentSnapshotsByMethod = computeTheorySnapshotsForCutoff(
    sessionId,
    spins.slice(0, startCutoff),
    wheelType,
    activePnlConfig
  );

  METHOD_ORDER.forEach((m) => {
    theorySnapshots[m].push(currentSnapshotsByMethod[m]);
  });

  const stateByMethod: Record<
    CandidateMethodId,
    { currentStreak: number; longestStreak: number; runningHits: number; runningTotal: number; prevCumulativePnl: number }
  > = {
    frequency: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    recency: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    transition: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    wheel_neighbour: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    opposite_pocket: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    sector: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    bayesian: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
    weighted_ensemble: { currentStreak: 0, longestStreak: 0, runningHits: 0, runningTotal: 0, prevCumulativePnl: 0 },
  };

  for (let i = startCutoff; i < spins.length; i++) {
    const spin = spins[i];
    const spinIndex = i + 1;

    METHOD_ORDER.forEach((methodId) => {
      const preSpinSnap = currentSnapshotsByMethod[methodId];
      const st = stateByMethod[methodId];

      const evalRecord = evaluateSpinAgainstTheorySnapshot(
        spin,
        spinIndex,
        preSpinSnap,
        st.currentStreak,
        st.longestStreak,
        st.runningHits,
        st.runningTotal,
        st.prevCumulativePnl
      );

      theoryEvaluations[methodId].push(evalRecord);

      st.currentStreak = evalRecord.currentStreak;
      st.longestStreak = evalRecord.longestStreak;
      st.runningHits = evalRecord.runningHits;
      st.runningTotal = evalRecord.runningTotal;
      if (evalRecord.pnlRecord) {
        st.prevCumulativePnl = evalRecord.pnlRecord.cumulativePnl;
      }
    });

    const historySoFar = spins.slice(0, i + 1);
    currentSnapshotsByMethod = computeTheorySnapshotsForCutoff(
      sessionId,
      historySoFar,
      wheelType,
      activePnlConfig,
      currentSnapshotsByMethod
    );

    METHOD_ORDER.forEach((m) => {
      theorySnapshots[m].push(currentSnapshotsByMethod[m]);
    });
  }

  // Build summary stats per method
  METHOD_ORDER.forEach((methodId) => {
    const meta = METHOD_LABELS[methodId];
    const evals = theoryEvaluations[methodId];
    const snaps = theorySnapshots[methodId];
    const st = stateByMethod[methodId];

    const evaluatedSpins = evals.filter((e) => e.result === 'HIT' || e.result === 'MISS').length;
    const totalHits = evals.filter((e) => e.result === 'HIT').length;
    const totalMisses = evals.filter((e) => e.result === 'MISS').length;
    const hitRatePercentage = evaluatedSpins > 0 ? (totalHits / evaluatedSpins) * 100 : 0;

    const latestPreSpin = snaps.length > 1 ? snaps[snaps.length - 2] : snaps[0] || null;
    const latestPostSpin = snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const candidateCount = latestPostSpin ? latestPostSpin.candidateCount : 18;

    const theoreticalCoveragePct = calculateTheoreticalCoverage(candidateCount, wheelType);
    const coverageDiffPct = hitRatePercentage - theoreticalCoveragePct;

    const lastEval = evals.length > 0 ? evals[evals.length - 1] : null;
    const pnlRecords = evals
      .map((e) => e.pnlRecord)
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);

    theoryStats[methodId] = {
      methodId,
      methodName: meta ? meta.fullName : methodId,
      shortName: meta ? meta.shortName : methodId,
      description: meta ? meta.description : '',
      candidateCount,
      evaluatedSpins,
      totalHits,
      totalMisses,
      hitRatePercentage,
      theoreticalCoveragePct,
      coverageDiffPct,
      currentStreak: st.currentStreak,
      longestStreak: st.longestStreak,
      latestWinningNumber: lastEval ? lastEval.spinNumber : spins.length > 0 ? spins[spins.length - 1].number : null,
      latestOutcome: lastEval ? lastEval.result : 'NOT_EVALUATED',
      latestTimestamp: lastEval ? lastEval.timestamp : Date.now(),
      latestPreSpinSnapshot: latestPreSpin,
      latestPostSpinSnapshot: latestPostSpin,
      pnlSummary: computePnlSummaryStats(pnlRecords, activePnlConfig),
    };
  });

  return {
    theorySnapshots,
    theoryEvaluations,
    theoryStats: theoryStats as Record<CandidateMethodId, TheoryPerformanceStats>,
  };
}
