/**
 * candidateDiff.ts
 *
 * Compares two candidate number sets (Previous Set vs New Set) by pocket membership.
 *
 * Set Mathematics:
 *  - Added numbers = New Set minus Previous Set
 *  - Removed numbers = Previous Set minus New Set
 *  - Unchanged numbers = Intersection (New Set ∩ Previous Set)
 */

export interface CandidateSetDiff {
  previousSet: string[];
  newSet: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
  isInitial: boolean;
}

/**
 * Compares a previous candidate pocket set with a new candidate pocket set.
 * Comparison is strictly by pocket number membership, NOT display position or order.
 */
export function compareCandidateSets(
  previousSet: string[] | null | undefined,
  newSet: string[]
): CandidateSetDiff {
  if (!previousSet || previousSet.length === 0) {
    return {
      previousSet: [],
      newSet: [...newSet],
      added: [],
      removed: [],
      unchanged: [...newSet],
      addedCount: 0,
      removedCount: 0,
      unchangedCount: newSet.length,
      hasChanges: false,
      isInitial: true,
    };
  }

  const prevSetObj = new Set(previousSet);
  const newSetObj = new Set(newSet);

  const added = newSet.filter((num) => !prevSetObj.has(num));
  const removed = previousSet.filter((num) => !newSetObj.has(num));
  const unchanged = newSet.filter((num) => prevSetObj.has(num));

  const hasChanges = added.length > 0 || removed.length > 0;

  return {
    previousSet: [...previousSet],
    newSet: [...newSet],
    added,
    removed,
    unchanged,
    addedCount: added.length,
    removedCount: removed.length,
    unchangedCount: unchanged.length,
    hasChanges,
    isInitial: false,
  };
}
