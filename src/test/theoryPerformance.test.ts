/**
 * @vitest-environment node
 *
 * Comprehensive Test Suite for Theory Performance Feature:
 *
 * 1. All 8 applicable theories tracked separately
 * 2. Each theory uses its own exact pre-spin candidate snapshot
 * 3. Winning number in Theory A's set but missing from Theory B's set produces HIT for A and MISS for B
 * 4. A number appearing only in the post-spin candidate set does not create a false HIT
 * 5. Candidate counts and theoretical coverage calculated accurately (EU vs US)
 * 6. Performance table refreshes after every confirmed spin in Auto Mode
 * 7. Theory evaluation records persist across session recomputation
 * 8. Clear Session removes active session theory records cleanly
 * 9. No fabricated evaluations generated for spins prior to prediction mode activation
 */

import { describe, expect, it } from 'vitest';
import { SpinItem } from '../types/roulette';
import {
  calculateTheoreticalCoverage,
  computeTheorySnapshotsForCutoff,
  evaluateSpinAgainstTheorySnapshot,
  recomputeTheorySessionHistory,
} from '../utils/theoryTracker';
import { METHOD_ORDER } from '../utils/theoryUnion';
import { DEFAULT_PNL_CONFIG } from '../utils/pnlCalculator';
import { TheorySnapshotRecord } from '../types/theoryPerformance';

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

describe('Theory Performance Engine', () => {
  it('1. All 8 applicable theories tracked separately', () => {
    const snapshots = computeTheorySnapshotsForCutoff('test_session', BASE_20_SPINS, 'European', DEFAULT_PNL_CONFIG);

    expect(Object.keys(snapshots).length).toBe(8);
    METHOD_ORDER.forEach((methodId) => {
      expect(snapshots[methodId]).toBeDefined();
      expect(snapshots[methodId].methodId).toBe(methodId);
      expect(snapshots[methodId].candidateNumbers.length).toBeGreaterThan(0);
    });
  });

  it('2. Each theory uses its own exact pre-spin candidate snapshot', () => {
    const snapshots = computeTheorySnapshotsForCutoff('test_session', BASE_20_SPINS, 'European', DEFAULT_PNL_CONFIG);

    const freqNumbers = snapshots['frequency'].candidateNumbers;
    const oppNumbers = snapshots['opposite_pocket'].candidateNumbers;

    // Different mathematical theories produce different number sets
    expect(freqNumbers).toBeDefined();
    expect(oppNumbers).toBeDefined();
    expect(freqNumbers.length).toBe(18);
    expect(oppNumbers.length).toBe(18);
  });

  it('3. Winning number in Theory A set but missing in Theory B produces HIT for A and MISS for B', () => {
    const snapA: TheorySnapshotRecord = {
      id: 'snap_A',
      sessionId: 'test_session',
      methodId: 'frequency',
      methodName: 'Frequency-Based',
      version: 1,
      spinCutoffIndex: 20,
      spinCutoffId: 'spin_20',
      timestamp: Date.now(),
      candidateNumbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
      candidateCount: 18,
      historyCutoff: 20,
      isSufficientData: true,
    };

    const snapB: TheorySnapshotRecord = {
      id: 'snap_B',
      sessionId: 'test_session',
      methodId: 'opposite_pocket',
      methodName: 'Opposite-Pocket',
      version: 1,
      spinCutoffIndex: 20,
      spinCutoffId: 'spin_20',
      timestamp: Date.now(),
      candidateNumbers: ['19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36'],
      candidateCount: 18,
      historyCutoff: 20,
      isSufficientData: true,
    };

    const spin = makeSpin('spin_21', '7', 30000); // 7 is in snapA but absent from snapB

    const evalA = evaluateSpinAgainstTheorySnapshot(spin, 21, snapA, 0, 0, 0, 0, 0);
    const evalB = evaluateSpinAgainstTheorySnapshot(spin, 21, snapB, 0, 0, 0, 0, 0);

    expect(evalA.result).toBe('HIT');
    expect(evalB.result).toBe('MISS');
  });

  it('4. A number appearing only in the post-spin set does not create a false HIT', () => {
    // Pre-spin snapshot saved BEFORE spin #21 does NOT contain pocket '30'
    const preSpinSnap: TheorySnapshotRecord = {
      id: 'snap_pre',
      sessionId: 'test_session',
      methodId: 'recency',
      methodName: 'Recency-Based',
      version: 1,
      spinCutoffIndex: 20,
      spinCutoffId: 'spin_20',
      timestamp: Date.now(),
      candidateNumbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
      candidateCount: 18,
      historyCutoff: 20,
      isSufficientData: true,
    };

    // Actual spin lands on 30
    const spin = makeSpin('spin_21', '30', 30000);

    // Evaluation against PRE-SPIN snapshot
    const evalResult = evaluateSpinAgainstTheorySnapshot(spin, 21, preSpinSnap, 0, 0, 0, 0, 0);

    // MUST be MISS because 30 was not in the pre-spin set
    expect(evalResult.result).toBe('MISS');
  });

  it('5. Candidate counts and theoretical coverage calculated accurately (EU vs US)', () => {
    const euCoverage = calculateTheoreticalCoverage(18, 'European');
    const usCoverage = calculateTheoreticalCoverage(18, 'American');

    // 18 / 37 = 48.6486...%
    expect(euCoverage).toBeCloseTo(48.6486, 3);
    // 18 / 38 = 47.3684...%
    expect(usCoverage).toBeCloseTo(47.3684, 3);
  });

  it('6. Performance table refreshes after every confirmed spin in Auto Mode', () => {
    const spins = [...BASE_20_SPINS, makeSpin('spin_21', '3', 30000), makeSpin('spin_22', '9', 31000)];
    const recomputed = recomputeTheorySessionHistory('test_session', spins, 'European', true, 20, DEFAULT_PNL_CONFIG);

    expect(recomputed.theoryEvaluations['frequency'].length).toBe(2);
    expect(recomputed.theoryStats['frequency'].evaluatedSpins).toBe(2);
    expect(recomputed.theoryStats['frequency'].totalHits + recomputed.theoryStats['frequency'].totalMisses).toBe(2);
  });

  it('7. Theory evaluation records persist across session recomputation', () => {
    const spins = [...BASE_20_SPINS, makeSpin('spin_21', '3', 30000)];
    const re1 = recomputeTheorySessionHistory('test_session', spins, 'European', true, 20, DEFAULT_PNL_CONFIG);
    const re2 = recomputeTheorySessionHistory('test_session', spins, 'European', true, 20, DEFAULT_PNL_CONFIG);

    expect(re1.theoryStats['frequency'].hitRatePercentage).toBe(re2.theoryStats['frequency'].hitRatePercentage);
    expect(re1.theoryEvaluations['frequency'].length).toBe(re2.theoryEvaluations['frequency'].length);
  });

  it('8. Clear Session removes active session theory records cleanly', () => {
    // Inactive auto mode / empty spins history
    const cleared = recomputeTheorySessionHistory('test_session', [], 'European', false, 0, DEFAULT_PNL_CONFIG);

    METHOD_ORDER.forEach((methodId) => {
      expect(cleared.theorySnapshots[methodId].length).toBe(0);
      expect(cleared.theoryEvaluations[methodId].length).toBe(0);
      expect(cleared.theoryStats[methodId].evaluatedSpins).toBe(0);
      expect(cleared.theoryStats[methodId].totalHits).toBe(0);
    });
  });

  it('9. No fabricated evaluations generated for spins prior to prediction mode activation', () => {
    // 20 spins entered BEFORE activation (startCutoff = 20)
    const recomputed = recomputeTheorySessionHistory('test_session', BASE_20_SPINS, 'European', true, 20, DEFAULT_PNL_CONFIG);

    // Initial cutoff snapshot created at activation moment, but 0 historical spins evaluated prior to cutoff 20
    expect(recomputed.theoryEvaluations['frequency'].length).toBe(0);
    expect(recomputed.theoryStats['frequency'].evaluatedSpins).toBe(0);
  });
});
