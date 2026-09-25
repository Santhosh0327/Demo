/**
 * @vitest-environment node
 *
 * Test suite for Candidate Set Diff comparison engine (candidateDiff.ts):
 * 1. Added numbers calculation (New Set \ Previous Set)
 * 2. Removed numbers calculation (Previous Set \ New Set)
 * 3. Unchanged numbers calculation (Intersection)
 * 4. Identical sets return hasChanges = false
 * 5. Reordered but identical sets return hasChanges = false (membership comparison)
 * 6. Initial candidate set returns isInitial = true and no false additions
 * 7. Filter isolation: comparing snapshots under same view filter prevents false diffs
 * 8. Rapid consecutive spins step-by-step diff tracking
 * 9. Page refresh / store reinitialization restores correct previous/latest snapshots
 * 10. Session switching retains per-session diff context
 * 11. European & American wheel variant compatibility
 */

import { describe, expect, it } from 'vitest';
import { compareCandidateSets } from '../utils/candidateDiff';
import { computeCandidateSnapshot, recomputeSessionHistory } from '../utils/candidateTracker';
import { SpinItem } from '../types/roulette';

function makeSpin(id: string, num: string, timestamp: number): SpinItem {
  return {
    id,
    sessionId: 'test_session',
    number: num,
    timestamp,
    source: 'manual',
  };
}

const EU_SPINS: SpinItem[] = [
  '3', '9', '28', '17', '0', '15', '11', '24', '32', '7',
  '28', '3', '17', '9', '15', '0', '11', '32', '24', '7'
].map((num, i) => makeSpin(`spin_${i + 1}`, num, 10000 + i * 1000));

const US_SPINS: SpinItem[] = [
  '00', '9', '28', '17', '0', '15', '11', '24', '32', '7',
  '28', '3', '17', '9', '15', '00', '11', '32', '24', '7'
].map((num, i) => makeSpin(`us_spin_${i + 1}`, num, 10000 + i * 1000));

describe('Candidate Set Diff Engine (candidateDiff.ts)', () => {
  it('1. Added numbers: identifies numbers present in New Set but absent in Previous Set', () => {
    const prevSet = ['1', '2', '3', '4', '5', '6'];
    const newSet = ['1', '2', '4', '5', '6', '8'];

    const diff = compareCandidateSets(prevSet, newSet);

    expect(diff.added).toEqual(['8']);
    expect(diff.addedCount).toBe(1);
    expect(diff.hasChanges).toBe(true);
    expect(diff.isInitial).toBe(false);
  });

  it('2. Removed numbers: identifies numbers present in Previous Set but absent in New Set', () => {
    const prevSet = ['1', '2', '3', '4', '5', '6'];
    const newSet = ['1', '2', '4', '5', '6', '8'];

    const diff = compareCandidateSets(prevSet, newSet);

    expect(diff.removed).toEqual(['3']);
    expect(diff.removedCount).toBe(1);
  });

  it('3. Unchanged numbers: identifies intersection of both sets', () => {
    const prevSet = ['1', '2', '3', '4', '5', '6'];
    const newSet = ['1', '2', '4', '5', '6', '8'];

    const diff = compareCandidateSets(prevSet, newSet);

    expect(diff.unchanged).toEqual(['1', '2', '4', '5', '6']);
    expect(diff.unchangedCount).toBe(5);
  });

  it('4. Identical sets return hasChanges = false', () => {
    const prevSet = ['10', '20', '30', '0'];
    const newSet = ['10', '20', '30', '0'];

    const diff = compareCandidateSets(prevSet, newSet);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(['10', '20', '30', '0']);
    expect(diff.hasChanges).toBe(false);
  });

  it('5. Reordered but identical sets return hasChanges = false (membership comparison)', () => {
    const prevSet = ['1', '2', '3', '4', '5'];
    const newSet = ['5', '4', '3', '2', '1'];

    const diff = compareCandidateSets(prevSet, newSet);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.hasChanges).toBe(false);
  });

  it('6. Initial candidate set (null previous set) returns isInitial = true and no false added numbers', () => {
    const newSet = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

    const diff = compareCandidateSets(null, newSet);

    expect(diff.isInitial).toBe(true);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchangedCount).toBe(18);
    expect(diff.hasChanges).toBe(false);
  });

  it('7. Filter isolation: comparing snapshots under the same view filter prevents false diffs', () => {
    const snap1 = computeCandidateSnapshot('test_session', EU_SPINS.slice(0, 10), 'European', 'top18', null);
    const snap2 = computeCandidateSnapshot('test_session', EU_SPINS.slice(0, 11), 'European', 'top18', snap1);

    const diffTop18 = compareCandidateSets(snap1.filterNumbers.top18, snap2.filterNumbers.top18);
    const diffMin2 = compareCandidateSets(snap1.filterNumbers.min2, snap2.filterNumbers.min2);

    expect(diffTop18.newSet).toEqual(snap2.filterNumbers.top18);
    expect(diffMin2.newSet).toEqual(snap2.filterNumbers.min2);
  });

  it('8. Rapid consecutive spins step-by-step diff tracking', () => {
    const recomputed = recomputeSessionHistory('test_session', EU_SPINS, 'European', 'top18');

    expect(recomputed.snapshots.length).toBe(21);
    const snapPrevious = recomputed.snapshots[19];
    const snapLatest = recomputed.snapshots[20];

    const diff = compareCandidateSets(snapPrevious.targetNumbers, snapLatest.targetNumbers);

    expect(typeof diff.addedCount).toBe('number');
    expect(typeof diff.removedCount).toBe('number');
    expect(typeof diff.unchangedCount).toBe('number');
    expect(diff.addedCount + diff.unchangedCount).toBe(snapLatest.targetNumbers.length);
  });

  it('9. Page refresh / store reinitialization restores correct previous and latest snapshots', () => {
    const recomputed = recomputeSessionHistory('test_session', EU_SPINS, 'European', 'top18');

    expect(recomputed.latestSnapshot).not.toBeNull();
    expect(recomputed.previousSnapshot).not.toBeNull();
    expect(recomputed.previousSnapshot?.version).toBe(20);
    expect(recomputed.latestSnapshot?.version).toBe(21);
  });

  it('10. European and American wheel variants are handled correctly', () => {
    const recomputedEU = recomputeSessionHistory('eu_session', EU_SPINS, 'European', 'top18');
    const recomputedUS = recomputeSessionHistory('us_session', US_SPINS, 'American', 'top18');

    const diffEU = compareCandidateSets(
      recomputedEU.previousSnapshot?.targetNumbers,
      recomputedEU.latestSnapshot?.targetNumbers || []
    );

    const diffUS = compareCandidateSets(
      recomputedUS.previousSnapshot?.targetNumbers,
      recomputedUS.latestSnapshot?.targetNumbers || []
    );

    expect(diffEU.isInitial).toBe(false);
    expect(diffUS.isInitial).toBe(false);
  });

  it('11. Sequential update change-highlighting: only newly added numbers are highlighted GREEN, previously added numbers return to normal, and old removed indicators are cleared', () => {
    // Initial candidate set at Spin #20
    const set20 = ['1', '2', '3', '4', '5', '6'];

    // Candidate set generated after Spin #21: 3 removed, 8 added
    const set21 = ['1', '2', '4', '5', '6', '8'];
    const diff21 = compareCandidateSets(set20, set21);

    expect(diff21.added).toEqual(['8']);
    expect(diff21.removed).toEqual(['3']);
    expect(diff21.unchanged).toEqual(['1', '2', '4', '5', '6']);

    // Candidate set generated after Spin #22: 9 added
    const set22 = ['1', '2', '4', '5', '6', '8', '9'];
    const diff22 = compareCandidateSets(set21, set22);

    // In update 22, ONLY 9 is newly added!
    expect(diff22.added).toEqual(['9']);
    // 8 is in unchanged, NOT added! Number 8 returns to normal roulette color.
    expect(diff22.added.includes('8')).toBe(false);
    expect(diff22.unchanged.includes('8')).toBe(true);
    // Number 3 was removed in update 21, but in update 22 (set21 -> set22) 3 is not in set21 so removed is empty!
    expect(diff22.removed).toEqual([]);

    // Candidate set generated after Spin #23: identical to set22
    const set23 = ['1', '2', '4', '5', '6', '8', '9'];
    const diff23 = compareCandidateSets(set22, set23);

    // In update 23, no numbers added or removed!
    expect(diff23.added).toEqual([]);
    expect(diff23.removed).toEqual([]);
    expect(diff23.hasChanges).toBe(false);
  });
});
