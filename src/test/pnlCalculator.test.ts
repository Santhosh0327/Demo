import { describe, expect, it } from 'vitest';
import { CandidateSnapshotRecord, PnlConfig, SpinItem } from '../types/roulette';
import {
  calculateCoveredReturn,
  computePnlSnapshotData,
  evaluatePnlForSpin,
  computePnlSummaryStats,
  isPnlConfigured,
  DEFAULT_PNL_CONFIG,
  UNCONFIGURED_PNL_CONFIG,
} from '../utils/pnlCalculator';
import {
  computeCandidateSnapshot,
  evaluateSpinAgainstSnapshot,
  recomputeSessionHistory,
} from '../utils/candidateTracker';

function makeSpin(id: string, num: string, timestamp: number): SpinItem {
  return {
    id,
    sessionId: 'test_session',
    number: num,
    timestamp,
    source: 'manual',
  };
}

const BASE_20_SPINS: SpinItem[] = [
  '3', '9', '28', '17', '0', '15', '11', '24', '32', '7',
  '28', '3', '17', '9', '15', '0', '11', '32', '24', '7'
].map((num, i) => makeSpin(`spin_${i + 1}`, num, 10000 + i * 1000));

const VALID_CONFIG: PnlConfig = {
  gameName: 'European VIP',
  currency: 'INR',
  startingBankroll: 10000,
  payoutFormat: 'total_return',
  payoutValue: 20,
  stakePerNumber: 100,
  selectedCoverage: 'all',
  requestedCoverageCount: 18,
  pnlTrackingEnabled: true,
  isConfigured: true,
};

describe('P&L Calculator Engine', () => {
  it('0. Handles unconfigured default state cleanly', () => {
    expect(isPnlConfigured(UNCONFIGURED_PNL_CONFIG)).toBe(false);
    expect(isPnlConfigured(DEFAULT_PNL_CONFIG)).toBe(false);

    const snap = computePnlSnapshotData(['1', '2', '3'], DEFAULT_PNL_CONFIG);
    expect(snap.isCoverageAvailable).toBe(false);
    expect(snap.totalStake).toBe(0);
    expect(snap.possibleNetProfit).toBe(0);
    expect(snap.statusMessage).toBe('Not configured');
  });

  it('1. Connects calculator automatically to selected prediction filter numbers (e.g. 29 for min2, 18 for min4)', () => {
    const config: PnlConfig = { ...VALID_CONFIG };
    delete (config as any).requestedCoverageCount;

    const min2Pockets = Array.from({ length: 29 }, (_, i) => String(i + 1));
    const min4Pockets = Array.from({ length: 18 }, (_, i) => String(i + 1));

    // When ≥ 2 Theories filter is active (29 numbers)
    const snapMin2 = computePnlSnapshotData(min2Pockets, config);
    expect(snapMin2.coveredCount).toBe(29);
    expect(snapMin2.totalStake).toBe(2900); // 29 * 100
    expect(snapMin2.possibleCoveredReturn).toBe(2000);
    expect(snapMin2.possibleNetProfit).toBe(-900);

    // When ≥ 4 Theories filter is active (18 numbers)
    const snapMin4 = computePnlSnapshotData(min4Pockets, config);
    expect(snapMin4.coveredCount).toBe(18);
    expect(snapMin4.totalStake).toBe(1800); // 18 * 100
    expect(snapMin4.possibleCoveredReturn).toBe(2000);
    expect(snapMin4.possibleNetProfit).toBe(200);
  });

  it('2. Both payout formats (total_return vs net_winnings)', () => {
    // 30x total_return vs 30:1 net_winnings
    const totalReturnVal = calculateCoveredReturn(100, 30, 'total_return');
    const netWinningsVal = calculateCoveredReturn(100, 30, 'net_winnings');

    // 100 * 30 = 3000
    expect(totalReturnVal).toBe(3000);
    // 100 * (30 + 1) = 3100
    expect(netWinningsVal).toBe(3100);
  });

  it('3. Covered (HIT) and uncovered (MISS) actual spin results evaluated against saved snapshot', () => {
    const config: PnlConfig = { ...VALID_CONFIG };
    const candidateSnapshot = computeCandidateSnapshot('test_session', BASE_20_SPINS, 'European', 'top18', null, config);
    const coveredNumber = candidateSnapshot.targetNumbers[0];
    const uncoveredNumber = '99';

    // Test HIT (Covered)
    const hitSpin = makeSpin('spin_hit', coveredNumber, 30000);
    const hitEval = evaluateSpinAgainstSnapshot(hitSpin, 21, candidateSnapshot, 0, 0, 0);

    expect(hitEval.result).toBe('HIT');
    expect(hitEval.pnlRecord).not.toBeNull();
    expect(hitEval.pnlRecord?.isCovered).toBe(true);
    expect(hitEval.pnlRecord?.totalStake).toBe(1800);
    expect(hitEval.pnlRecord?.coveredReturn).toBe(2000);
    expect(hitEval.pnlRecord?.realizedPnl).toBe(200);
    expect(hitEval.pnlRecord?.cumulativePnl).toBe(200);
    expect(hitEval.pnlRecord?.currentBankroll).toBe(10200);

    // Test MISS (Uncovered)
    const missSpin = makeSpin('spin_miss', uncoveredNumber, 31000);
    const missEval = evaluateSpinAgainstSnapshot(missSpin, 21, candidateSnapshot, 0, 0, 200);

    expect(missEval.result).toBe('MISS');
    expect(missEval.pnlRecord).not.toBeNull();
    expect(missEval.pnlRecord?.isCovered).toBe(false);
    expect(missEval.pnlRecord?.realizedPnl).toBe(-1800);
    expect(missEval.pnlRecord?.cumulativePnl).toBe(-1600);
    expect(missEval.pnlRecord?.currentBankroll).toBe(8400);
  });

  it('4. Zero ("0") and double-zero ("00") pocket handling', () => {
    const config: PnlConfig = {
      ...VALID_CONFIG,
      payoutValue: 36,
      stakePerNumber: 50,
      startingBankroll: 5000,
    };

    const targetPockets = ['0', '00', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
    const snapshotWithZeros: CandidateSnapshotRecord = {
      id: 'snap_zeros',
      sessionId: 'test_session',
      timestamp: Date.now(),
      targetFilter: 'top18' as const,
      targetNumbers: targetPockets,
      allUnionNumbers: ['0', '00'],
      filterNumbers: {
        all: ['0', '00'],
        min2: [],
        min4: [],
        all_applicable: [],
        top18: targetPockets,
      },
      targetSetSize: 18,
      version: 1,
      spinCutoffIndex: 20,
      spinCutoffId: 'spin_20',
      pnlData: computePnlSnapshotData(targetPockets, config, 'American'),
    };

    const spinZero = makeSpin('spin_0', '0', 40000);
    const evalZero = evaluateSpinAgainstSnapshot(spinZero, 21, snapshotWithZeros, 0, 0, 0);

    expect(evalZero.result).toBe('HIT');
    expect(evalZero.pnlRecord?.realizedPnl).toBe(900);

    const snapshotWithZeros21 = { ...snapshotWithZeros, spinCutoffIndex: 21, spinCutoffId: 'spin_21' };
    const spinDoubleZero = makeSpin('spin_00', '00', 41000);
    const evalDoubleZero = evaluateSpinAgainstSnapshot(spinDoubleZero, 22, snapshotWithZeros21, 0, 0, 900);

    expect(evalDoubleZero.result).toBe('HIT');
    expect(evalDoubleZero.pnlRecord?.realizedPnl).toBe(900);
    expect(evalDoubleZero.pnlRecord?.cumulativePnl).toBe(1800);
  });

  it('5. Immutable snapshot tracking: filter change before spin arrival updates pre-spin P&L snapshot without altering past realized P&L', () => {
    const config: PnlConfig = { ...VALID_CONFIG, stakePerNumber: 100 };

    // Run session history with 21 spins using 'top18'
    const spins = [...BASE_20_SPINS, makeSpin('spin_21', '3', 30000)];
    const runMin4 = recomputeSessionHistory('test_session', spins, 'European', 'min4', true, 20, config);

    const pastEvaluations = [...runMin4.evaluations];
    expect(pastEvaluations.length).toBe(1);

    // Switch prediction filter to 'min2' before spin 22
    const snapMin2 = computeCandidateSnapshot('test_session', spins, 'European', 'min2', runMin4.latestSnapshot, config);

    // Evaluate new spin 22 against newly saved pre-spin snapshot snapMin2
    const spin22 = makeSpin('spin_22', '9', 31000);
    const eval22 = evaluateSpinAgainstSnapshot(spin22, 22, snapMin2, runMin4.performanceStats.pnlSummary?.totalWinningSpins || 0, runMin4.performanceStats.pnlSummary?.totalLosingSpins || 0, runMin4.performanceStats.pnlSummary?.cumulativePnl || 0);

    // Past realized evaluation for spin 21 remains locked to initial pre-spin snapshot ID
    const initialPreSpinSnapshotId = runMin4.snapshots[0].id;
    expect(runMin4.evaluations[0].snapshotId).toBe(initialPreSpinSnapshotId);
    expect(eval22.snapshotId).toBe(snapMin2.id);
  });

  it('6. Automatic synchronization upon new spin arrival in Auto Mode', () => {
    const config: PnlConfig = { ...VALID_CONFIG };
    const spins = [...BASE_20_SPINS];

    const res1 = recomputeSessionHistory('test_session', spins, 'European', 'min2', true, 20, config);
    expect(res1.latestSnapshot).not.toBeNull();
    const countBefore = res1.latestSnapshot?.pnlData?.coveredCount;

    // Add spin in Auto Mode
    const spinsWithNew = [...spins, makeSpin('spin_21', '28', 30000)];
    const res2 = recomputeSessionHistory('test_session', spinsWithNew, 'European', 'min2', true, 20, config);

    expect(res2.evaluations.length).toBe(1);
    expect(res2.latestSnapshot).not.toBeNull();
    // Calculator snapshot updated for next spin
    expect(res2.latestSnapshot?.spinCutoffIndex).toBe(21);
  });

  it('7. Handles zero candidate filter states cleanly', () => {
    const config: PnlConfig = { ...VALID_CONFIG };
    const emptyPockets: string[] = [];
    const pnlData = computePnlSnapshotData(emptyPockets, config, 'European');

    expect(pnlData.isCoverageAvailable).toBe(false);
    expect(pnlData.coveredCount).toBe(0);
    expect(pnlData.statusMessage).toBe('No candidate numbers available');
  });

  it('8. Session reset clears candidate coverage and restores starting tracking balance', () => {
    const config: PnlConfig = { ...VALID_CONFIG, startingBankroll: 15000 };
    const recomputed = recomputeSessionHistory('test_session', [], 'European', 'top18', false, 0, config);

    expect(recomputed.snapshots.length).toBe(0);
    expect(recomputed.evaluations.length).toBe(0);
    expect(recomputed.performanceStats.pnlSummary?.cumulativePnl).toBe(0);
    expect(recomputed.performanceStats.pnlSummary?.currentBankroll).toBe(15000);
    expect(recomputed.performanceStats.pnlSummary?.totalPnlSpins).toBe(0);
  });
});

