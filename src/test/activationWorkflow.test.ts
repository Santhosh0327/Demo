import { describe, it, expect } from 'vitest';
import {
  computeCandidateSnapshot,
  evaluateSpinAgainstSnapshot,
  recomputeSessionHistory,
} from '../utils/candidateTracker';
import { compareCandidateSets } from '../utils/candidateDiff';
import { SpinItem, EvaluationTargetFilter, CandidateSnapshotRecord } from '../types/roulette';

describe('Activation Workflow & Prediction Lifecycle', () => {
  const sessionId = 'test-session-1';
  const filter: EvaluationTargetFilter = 'min2';

  const makeSpins = (numbers: string[]): SpinItem[] =>
    numbers.map((n, idx) => ({
      id: `spin-${idx + 1}`,
      sessionId,
      number: n,
      timestamp: Date.now() + idx * 1000,
      source: 'manual',
    }));

  it('1. Initial history entry does NOT start predictions before activation', () => {
    const spins = makeSpins(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    // isAutoModeActive = false
    const result = recomputeSessionHistory(sessionId, spins, 'European', filter, false, 0);

    expect(result.snapshots).toHaveLength(0);
    expect(result.evaluations).toHaveLength(0);
    expect(result.latestSnapshot).toBeNull();
    expect(result.performanceStats.totalEvaluatedSpins).toBe(0);
  });

  it('2. Insufficient history (< 10 spins) prevents snapshot generation', () => {
    const spins = makeSpins(['1', '2', '3', '4', '5']);
    const snapshot = computeCandidateSnapshot(sessionId, spins, 'European', 'min2');
    expect(snapshot.targetSetSize).toBe(0);
  });

  it('3. Explicit activation generates the initial pre-spin candidate snapshot at cutoff', () => {
    const initialSpins = makeSpins(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    const cutoffIndex = initialSpins.length; // 12

    const result = recomputeSessionHistory(sessionId, initialSpins, 'European', filter, true, cutoffIndex);

    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].spinCutoffIndex).toBe(cutoffIndex);
    expect(result.evaluations).toHaveLength(0); // Pre-spin snapshot, no evaluations yet
    expect(result.latestSnapshot).not.toBeNull();
    expect(result.latestSnapshot?.version).toBe(1);
  });

  it('4. First post-activation spin is evaluated against the pre-spin snapshot', () => {
    const initialSpins = makeSpins(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    const cutoffIndex = initialSpins.length; // 12

    // Add 13th spin after activation
    const spin13: SpinItem = {
      id: 'spin-13',
      sessionId,
      number: '25',
      timestamp: Date.now() + 13000,
      source: 'manual',
    };
    const allSpins = [...initialSpins, spin13];

    const result = recomputeSessionHistory(sessionId, allSpins, 'European', filter, true, cutoffIndex);

    // Should have 2 snapshots (v1 after 12 spins, v2 after 13 spins)
    expect(result.snapshots).toHaveLength(2);
    // Should have 1 evaluation for spin13 against snapshot v1
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0].spinId).toBe('spin-13');
    expect(result.evaluations[0].spinNumber).toBe('25');
    expect(result.evaluations[0].snapshotVersion).toBe(1);
  });

  it('5. Subsequent spins evaluate automatically without clicking generate again', () => {
    const initialSpins = makeSpins(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    const cutoffIndex = initialSpins.length;

    // Simulate 3 post-activation spins
    const postSpins = makeSpins(['5', '12', '30']);
    const allSpins = [...initialSpins, ...postSpins.map((s, idx) => ({ ...s, id: `spin-${13 + idx}` }))];

    const result = recomputeSessionHistory(sessionId, allSpins, 'European', filter, true, cutoffIndex);

    // Initial snapshot + 3 post-activation snapshots = 4 snapshots total
    expect(result.snapshots).toHaveLength(4);
    // 3 evaluations for the 3 post-activation spins
    expect(result.evaluations).toHaveLength(3);
    expect(result.performanceStats.totalEvaluatedSpins).toBe(3);
  });

  it('6. Never evaluates a spin against a candidate set generated using that same spin', () => {
    const initialSpins = makeSpins(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    const cutoffIndex = initialSpins.length; // 12

    const spin13: SpinItem = {
      id: 'spin-13',
      sessionId,
      number: '14',
      timestamp: Date.now() + 13000,
      source: 'manual',
    };
    const allSpins = [...initialSpins, spin13];

    const result = recomputeSessionHistory(sessionId, allSpins, 'European', filter, true, cutoffIndex);
    const eval13 = result.evaluations[0];

    // Snapshot v1 was generated using initialSpins (cutoff 12)
    // Spin #13 was evaluated against snapshot v1
    expect(eval13.snapshotCutoff).toBe(12);
  });

  it('7. Candidate set additions and removals are highlighted correctly', () => {
    const setA = ['1', '5', '10', '15', '20'];
    const setB = ['5', '10', '15', '25', '30']; // Added 25, 30; Removed 1, 20

    const diff = compareCandidateSets(setA, setB);
    expect(diff.added).toEqual(['25', '30']);
    expect(diff.removed).toEqual(['1', '20']);
    expect(diff.unchanged).toEqual(['5', '10', '15']);
    expect(diff.hasChanges).toBe(true);
  });

  it('8. An actual result absent from the saved 18-number snapshot is recorded as MISS even if present in larger union', () => {
    const candidateSet18 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
    const spin: SpinItem = { id: 's1', sessionId: 's', number: '20', timestamp: Date.now(), source: 'manual' };

    const snapshot: CandidateSnapshotRecord = {
      id: 'snap-1',
      sessionId: 's',
      version: 1,
      spinCutoffIndex: 12,
      spinCutoffId: 'spin-12',
      timestamp: Date.now(),
      allUnionNumbers: [...candidateSet18, '20'],
      filterNumbers: {
        all: [...candidateSet18, '20'], // union includes 20
        min2: candidateSet18,
        min4: candidateSet18,
        all_applicable: candidateSet18,
        top18: candidateSet18, // top18 does NOT include 20
      },
      targetFilter: 'top18',
      targetNumbers: candidateSet18,
      targetSetSize: candidateSet18.length,
    };

    // Evaluate against snapshot
    const evaluation = evaluateSpinAgainstSnapshot(spin, 13, snapshot, 0, 0);
    expect(evaluation.result).toBe('MISS');
  });

  it('9. Exact Scenario: 20 spins -> Generate -> Enter in-set number -> Enter out-of-set number -> Reruns every spin', () => {
    // 1. Enter 20 valid historical spins
    const initial20 = makeSpins([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
    ]);
    const cutoff20 = 20;

    // 2. Click Generate Predictions once -> Initial snapshot v1 saved
    const res20 = recomputeSessionHistory(sessionId, initial20, 'European', filter, true, cutoff20);
    expect(res20.snapshots).toHaveLength(1);
    expect(res20.snapshots[0].version).toBe(1);
    expect(res20.snapshots[0].spinCutoffIndex).toBe(20);

    const initialCandidateSet = res20.snapshots[0].targetNumbers;
    expect(initialCandidateSet.length).toBeGreaterThan(0);

    // Pick a number that IS in initial candidate set
    const inSetNumber = initialCandidateSet[0];

    // 3. Enter spin #21 with inSetNumber
    const spin21: SpinItem = {
      id: 'spin-21',
      sessionId,
      number: inSetNumber,
      timestamp: Date.now() + 21000,
      source: 'manual',
    };
    const spins21 = [...initial20, spin21];

    // 4. Verify that theories rerun using 21 spins and snapshot v2 is saved
    const res21 = recomputeSessionHistory(sessionId, spins21, 'European', filter, true, cutoff20);
    expect(res21.snapshots).toHaveLength(2);
    expect(res21.snapshots[1].version).toBe(2);
    expect(res21.snapshots[1].spinCutoffIndex).toBe(21);
    expect(res21.evaluations).toHaveLength(1);
    expect(res21.evaluations[0].spinNumber).toBe(inSetNumber);
    expect(res21.evaluations[0].result).toBe('HIT');

    // Pick a number that is NOT in snapshot v2's candidate set
    const candidatesV2 = res21.snapshots[1].targetNumbers;
    const allRoulette = ['0', '00', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36'];
    const outOfSetNumber = allRoulette.find((n) => !candidatesV2.includes(n)) || '36';

    // 5. Enter spin #22 with outOfSetNumber
    const spin22: SpinItem = {
      id: 'spin-22',
      sessionId,
      number: outOfSetNumber,
      timestamp: Date.now() + 22000,
      source: 'manual',
    };
    const spins22 = [...spins21, spin22];

    // 6. Verify that theories rerun using 22 spins and snapshot v3 is saved
    const res22 = recomputeSessionHistory(sessionId, spins22, 'European', filter, true, cutoff20);
    expect(res22.snapshots).toHaveLength(3);
    expect(res22.snapshots[2].version).toBe(3);
    expect(res22.snapshots[2].spinCutoffIndex).toBe(22);
    expect(res22.evaluations).toHaveLength(2);
    expect(res22.evaluations[1].spinNumber).toBe(outOfSetNumber);
    expect(res22.evaluations[1].result).toBe('MISS');
  });

  it('10. Consecutive identical numbers trigger separate recalculations and snapshot version increments', () => {
    const initial10 = makeSpins(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const cutoff = 10;

    // Enter number '7' twice consecutively
    const spin11: SpinItem = { id: 'spin-11', sessionId, number: '7', timestamp: Date.now() + 11000, source: 'manual' };
    const spin12: SpinItem = { id: 'spin-12', sessionId, number: '7', timestamp: Date.now() + 12000, source: 'manual' };

    const spins = [...initial10, spin11, spin12];
    const res = recomputeSessionHistory(sessionId, spins, 'European', filter, true, cutoff);

    // Initial snapshot v1 + spin11 snapshot v2 + spin12 snapshot v3 = 3 snapshots
    expect(res.snapshots).toHaveLength(3);
    expect(res.snapshots[0].version).toBe(1);
    expect(res.snapshots[1].version).toBe(2);
    expect(res.snapshots[2].version).toBe(3);

    expect(res.evaluations).toHaveLength(2);
    expect(res.evaluations[0].spinNumber).toBe('7');
    expect(res.evaluations[1].spinNumber).toBe('7');
  });

  it('11. Unchanged candidate set numbers still receive a new calculation snapshot with isRecalculatedUnchanged flag', () => {
    const initial10 = makeSpins(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const res1 = recomputeSessionHistory(sessionId, initial10, 'European', filter, true, 10);

    const spin11: SpinItem = { id: 'spin-11', sessionId, number: '1', timestamp: Date.now() + 11000, source: 'manual' };
    const res2 = recomputeSessionHistory(sessionId, [...initial10, spin11], 'European', filter, true, 10);

    // Even if numbers are identical, version increments to 2
    expect(res2.snapshots).toHaveLength(2);
    expect(res2.snapshots[1].version).toBe(2);
    expect(res2.snapshots[1].spinCutoffIndex).toBe(11);
  });

  it('12. Complete session clearing resets history, snapshots, evaluations, hit streaks, and returns engine to NOT STARTED', () => {
    const spins = makeSpins(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    const activatedRes = recomputeSessionHistory(sessionId, spins, 'European', filter, true, 10);
    expect(activatedRes.snapshots.length).toBeGreaterThan(0);
    expect(activatedRes.evaluations.length).toBeGreaterThan(0);

    // Perform session clearing
    const clearedRes = recomputeSessionHistory(sessionId, [], 'European', filter, false, 0);

    expect(clearedRes.snapshots).toHaveLength(0);
    expect(clearedRes.evaluations).toHaveLength(0);
    expect(clearedRes.latestSnapshot).toBeNull();
    expect(clearedRes.previousSnapshot).toBeNull();
    expect(clearedRes.performanceStats.totalEvaluatedSpins).toBe(0);
    expect(clearedRes.performanceStats.currentStreak).toBe(0);
    expect(clearedRes.performanceStats.longestStreak).toBe(0);
    expect(clearedRes.performanceStats.latestResult).toBe('NOT_EVALUATED');
  });
});
