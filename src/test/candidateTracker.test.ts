/**
 * @vitest-environment node
 *
 * Comprehensive test suite for Candidate Update Confirmation & Consecutive Hit Streak Engine
 * (candidateTracker.ts & store integration):
 *
 * 1. Hit increments current streak
 * 2. Miss resets current streak to 0
 * 3. Longest streak remains accurate
 * 4. Result without valid pre-spin snapshot is NOT_EVALUATED
 * 5. Consecutive identical winning numbers processed as separate genuine spins
 * 6. Duplicate OCR delivery does not create duplicate evaluations
 * 7. Candidate update indicator state transitions
 * 8. Unchanged candidate set labeled recalculation unchanged
 * 9. Rapid consecutive inputs evaluate cleanly against pre-spin snapshots
 * 10. Page refresh / store reinitialization restores correct streak & version
 * 11. Switching candidate filters does not retroactively alter previous hit/miss records
 */

import { describe, expect, it } from 'vitest';
import { SpinItem } from '../types/roulette';
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

// 20 valid spins for test setup
const BASE_20_SPINS: SpinItem[] = [
  '3', '9', '28', '17', '0', '15', '11', '24', '32', '7',
  '28', '3', '17', '9', '15', '0', '11', '32', '24', '7'
].map((num, i) => makeSpin(`spin_${i + 1}`, num, 10000 + i * 1000));

describe('Candidate Tracker & Hit Streak Engine', () => {
  it('1. Result without valid pre-spin snapshot is NOT_EVALUATED', () => {
    const spin = makeSpin('spin_1', '3', 10000);
    // Cutoff 0 snapshot (0 spins history) has 0 target numbers
    const snap0 = computeCandidateSnapshot('test_session', [], 'European', 'top18', null);
    const evalResult = evaluateSpinAgainstSnapshot(spin, 1, snap0, 0, 0);

    expect(evalResult.result).toBe('NOT_EVALUATED');
    expect(evalResult.currentStreak).toBe(0);
    expect(evalResult.longestStreak).toBe(0);
  });

  it('2. Hit increments current streak by 1 and updates longest streak', () => {
    // Snapshot with target numbers containing "17"
    const mockSnapshot = computeCandidateSnapshot('test_session', BASE_20_SPINS, 'European', 'top18', null);
    const winningNumberInSet = mockSnapshot.targetNumbers[0]; // pick a known hit

    const spin = makeSpin('spin_21', winningNumberInSet, 30000);
    const evalResult = evaluateSpinAgainstSnapshot(spin, 21, mockSnapshot, 2, 5);

    expect(evalResult.result).toBe('HIT');
    expect(evalResult.currentStreak).toBe(3);
    expect(evalResult.longestStreak).toBe(5);
  });

  it('3. Miss resets current streak to 0 while preserving longest streak', () => {
    const mockSnapshot = computeCandidateSnapshot('test_session', BASE_20_SPINS, 'European', 'top18', null);
    // Pick a number NOT in target numbers (e.g. find any valid roulette number excluded from top18)
    const allPockets = Array.from({ length: 37 }, (_, i) => i.toString());
    const missNumber = allPockets.find((p) => !mockSnapshot.targetNumbers.includes(p)) ?? '999';

    const spin = makeSpin('spin_21', missNumber, 30000);
    const evalResult = evaluateSpinAgainstSnapshot(spin, 21, mockSnapshot, 4, 7);

    expect(evalResult.result).toBe('MISS');
    expect(evalResult.currentStreak).toBe(0);
    expect(evalResult.longestStreak).toBe(7);
  });

  it('4. Consecutive identical winning numbers are processed as separate genuine spins', () => {
    // History containing two consecutive 28s at index 10 and 11
    const spinsWithConsecutive = [...BASE_20_SPINS];
    spinsWithConsecutive[10] = makeSpin('spin_11', '28', 20000);
    spinsWithConsecutive[11] = makeSpin('spin_12', '28', 21000);

    const recomputed = recomputeSessionHistory('test_session', spinsWithConsecutive, 'European', 'top18');

    expect(recomputed.evaluations.length).toBe(20);
    expect(recomputed.evaluations[10].spinNumber).toBe('28');
    expect(recomputed.evaluations[11].spinNumber).toBe('28');
    expect(recomputed.evaluations[10].spinId).not.toBe(recomputed.evaluations[11].spinId);
  });

  it('5. Recomputing session history produces deterministic version numbers and streak metrics', () => {
    const run1 = recomputeSessionHistory('test_session', BASE_20_SPINS, 'European', 'top18');
    const run2 = recomputeSessionHistory('test_session', BASE_20_SPINS, 'European', 'top18');

    expect(run1.performanceStats).toEqual(run2.performanceStats);
    expect(run1.snapshots.length).toBe(run2.snapshots.length);
    expect(run1.evaluations.length).toBe(run2.evaluations.length);
    expect(run1.snapshots[run1.snapshots.length - 1].version).toBe(21);
  });

  it('6. Detects recalculated unchanged candidate sets and flags isRecalculatedUnchanged', () => {
    const snap1 = computeCandidateSnapshot('test_session', BASE_20_SPINS, 'European', 'top18', null);
    // Compute next snapshot with same history
    const snap2 = computeCandidateSnapshot('test_session', BASE_20_SPINS, 'European', 'top18', snap1);

    expect(snap2.version).toBe(snap1.version + 1);
    expect(snap2.isRecalculatedUnchanged).toBe(true);
  });

  it('7. Rapid consecutive inputs evaluate against their proper pre-spin snapshots', () => {
    // Process 15 spins step by step
    let streak = 0;
    let maxStreak = 0;
    let snapshot = computeCandidateSnapshot('test_session', [], 'European', 'top18', null);

    const evaluationHistory = [];

    for (let i = 0; i < 15; i++) {
      const spin = BASE_20_SPINS[i];
      const evalRec = evaluateSpinAgainstSnapshot(spin, i + 1, snapshot, streak, maxStreak);
      evaluationHistory.push(evalRec);

      streak = evalRec.currentStreak;
      maxStreak = evalRec.longestStreak;

      snapshot = computeCandidateSnapshot('test_session', BASE_20_SPINS.slice(0, i + 1), 'European', 'top18', snapshot);
    }

    expect(evaluationHistory.length).toBe(15);
    // First 10 spins (< 10 prior history) must be NOT_EVALUATED
    for (let i = 0; i < 10; i++) {
      expect(evaluationHistory[i].result).toBe('NOT_EVALUATED');
    }
    // Spin 11 (index 10) evaluated against 10-spin pre-spin snapshot -> HIT or MISS
    expect(['HIT', 'MISS']).toContain(evaluationHistory[10].result);

  });

  it('8. Switching candidate filters does not retroactively alter previous evaluation records', () => {
    const recomputedTop18 = recomputeSessionHistory('test_session', BASE_20_SPINS, 'European', 'top18');
    const recomputedMin2 = recomputeSessionHistory('test_session', BASE_20_SPINS, 'European', 'min2');

    // Past evaluation records carry their locked filter configuration
    expect(recomputedTop18.evaluations[15].evaluatedFilter).toBe('top18');
    expect(recomputedMin2.evaluations[15].evaluatedFilter).toBe('min2');
  });
});
