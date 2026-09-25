/**
 * theoryUnion.ts
 *
 * Computes the deduplicated union of all applicable strategy outputs.
 * Each pocket is tagged with which theories included it and its rank within each.
 *
 * Keeps all eight existing strategy calculations unchanged.
 * Does NOT interpret multi-theory agreement as a calibrated winning probability.
 */

import { CandidateMethodId, CandidateSnapshotRecord } from './candidateEngineLab';
import { isValidRouletteNumber } from './casinoScores';
import { WheelType } from '../types/roulette';

// ─── Constants ────────────────────────────────────────────────────────────────

export const METHOD_ORDER: CandidateMethodId[] = [
  'frequency',
  'recency',
  'transition',
  'wheel_neighbour',
  'opposite_pocket',
  'sector',
  'bayesian',
  'weighted_ensemble',
];

export const METHOD_LABELS: Record<CandidateMethodId, { shortName: string; fullName: string; description: string }> = {
  frequency: {
    shortName: 'Freq',
    fullName: 'Frequency-Based',
    description: 'Top 18 pockets by historical occurrence count in the active window.',
  },
  recency: {
    shortName: 'Rec',
    fullName: 'Recency-Based',
    description: '18 most recently appearing pockets in chronological history.',
  },
  transition: {
    shortName: 'Trans',
    fullName: 'Transition (Markov)',
    description: '18 pockets with highest 1st-order transition count following the last result.',
  },
  wheel_neighbour: {
    shortName: 'Nbr',
    fullName: 'Wheel-Neighbour',
    description: '18 physical pockets adjacent to the last winning pocket on the wheel track.',
  },
  opposite_pocket: {
    shortName: 'Opp',
    fullName: 'Opposite-Pocket',
    description: '18 pockets centered around the diametrically opposite wheel pocket.',
  },
  sector: {
    shortName: 'Sec',
    fullName: 'Sector (Voisins / Quadrant)',
    description: '18 pockets from the top-hit wheel sector (EU: Voisins du Zéro; US: quadrant).',
  },
  bayesian: {
    shortName: 'Bayes',
    fullName: 'Bayesian Smoothed',
    description: '18 pockets by Laplace-smoothed Dirichlet posterior probability.',
  },
  weighted_ensemble: {
    shortName: 'Ens',
    fullName: 'Weighted Ensemble',
    description: 'Configurable blend of Frequency, Recency, Transition, Neighbour, Opposite, Sector & Bayesian.',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TheoryContribution {
  methodId: CandidateMethodId;
  /** 1-based rank within this method's output (1 = first pick) */
  rankInMethod: number;
}

export interface UnionPocketEntry {
  /** Single valid roulette pocket string */
  number: string;
  /** How many applicable (sufficient-data) theories included this pocket */
  agreementCount: number;
  /** Which theories included it (and at what rank) */
  theories: TheoryContribution[];
}

export interface TheoryUnionResult {
  /** All unique pockets suggested by at least one applicable theory, sorted by agreementCount desc, then numeric asc */
  allUnionPockets: UnionPocketEntry[];
  /** Number of theories that produced valid (sufficient-data) outputs */
  applicableTheoryCount: number;
  /** IDs of theories that produced valid outputs */
  applicableTheoryIds: CandidateMethodId[];
  /** IDs of theories that were unavailable (insufficient history) */
  unavailableTheoryIds: CandidateMethodId[];
  /** History cutoff used (from snapshots) */
  historyCutoff: number;
  /** Timestamp of computation */
  timestamp: number;
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Builds the deduplicated theory-union from all method snapshots.
 *
 * @param allMethods - The map of CandidateMethodId → CandidateSnapshotRecord
 * @param wheelType  - The active wheel variant (for validation)
 * @returns TheoryUnionResult
 */
export function buildTheoryUnion(
  allMethods: Record<CandidateMethodId, CandidateSnapshotRecord>,
  wheelType: WheelType
): TheoryUnionResult {
  const applicableTheoryIds: CandidateMethodId[] = [];
  const unavailableTheoryIds: CandidateMethodId[] = [];

  // Determine which theories produced valid outputs
  for (const methodId of METHOD_ORDER) {
    const snap = allMethods[methodId];
    if (snap && snap.isSufficientData && snap.selectedNumbers.length > 0) {
      // Extra guard: every pocket in the snapshot must be a valid roulette number
      const allValid = snap.selectedNumbers.every((n) => isValidRouletteNumber(n, wheelType));
      if (allValid) {
        applicableTheoryIds.push(methodId);
      } else {
        console.warn(`[TheoryUnion] Method "${methodId}" has invalid pocket values — marking unavailable`);
        unavailableTheoryIds.push(methodId);
      }
    } else {
      unavailableTheoryIds.push(methodId);
    }
  }

  // Build union map: pocket → UnionPocketEntry
  const unionMap = new Map<string, UnionPocketEntry>();

  for (const methodId of applicableTheoryIds) {
    const snap = allMethods[methodId];
    snap.selectedNumbers.forEach((pocket, idx) => {
      if (!isValidRouletteNumber(pocket, wheelType)) return;

      if (!unionMap.has(pocket)) {
        unionMap.set(pocket, {
          number: pocket,
          agreementCount: 0,
          theories: [],
        });
      }

      const entry = unionMap.get(pocket)!;
      entry.agreementCount += 1;
      entry.theories.push({
        methodId,
        rankInMethod: idx + 1,
      });
    });
  }

  // Convert to sorted array: highest agreement first, then numerically ascending
  const allUnionPockets = Array.from(unionMap.values()).sort((a, b) => {
    if (b.agreementCount !== a.agreementCount) return b.agreementCount - a.agreementCount;
    // Deterministic tie-break: numeric ascending ('0', '1', '2'...)
    const aNum = a.number === '00' ? -0.5 : parseInt(a.number, 10);
    const bNum = b.number === '00' ? -0.5 : parseInt(b.number, 10);
    return aNum - bNum;
  });

  // Derive historyCutoff from first applicable snapshot
  const firstSnap = applicableTheoryIds.length > 0 ? allMethods[applicableTheoryIds[0]] : null;

  return {
    allUnionPockets,
    applicableTheoryCount: applicableTheoryIds.length,
    applicableTheoryIds,
    unavailableTheoryIds,
    historyCutoff: firstSnap?.historyCutoff ?? 0,
    timestamp: Date.now(),
  };
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

export type FilterLevel = 'all' | 'min2' | 'min4' | 'all_applicable';

export function applyUnionFilter(
  pockets: UnionPocketEntry[],
  filter: FilterLevel,
  applicableTheoryCount: number
): UnionPocketEntry[] {
  switch (filter) {
    case 'all':
      return pockets;
    case 'min2':
      return pockets.filter((p) => p.agreementCount >= 2);
    case 'min4':
      return pockets.filter((p) => p.agreementCount >= 4);
    case 'all_applicable':
      return applicableTheoryCount > 0
        ? pockets.filter((p) => p.agreementCount >= applicableTheoryCount)
        : [];
    default:
      return pockets;
  }
}

/**
 * Returns the Top-N pockets by agreement count.
 * If fewer than N unique pockets exist, returns the actual count.
 * Uses the same sort order as buildTheoryUnion (agreement desc, numeric asc).
 */
export function getTopNByAgreement(
  pockets: UnionPocketEntry[],
  n: number = 18
): UnionPocketEntry[] {
  // Already sorted by agreement desc — just slice
  return pockets.slice(0, n);
}

/**
 * Extracts target number arrays for all candidate filter options from union result.
 */
export function extractFilterNumbers(
  allUnionPockets: UnionPocketEntry[],
  applicableTheoryCount: number
) {
  return {
    all: allUnionPockets.map((p) => p.number),
    min2: applyUnionFilter(allUnionPockets, 'min2', applicableTheoryCount).map((p) => p.number),
    min4: applyUnionFilter(allUnionPockets, 'min4', applicableTheoryCount).map((p) => p.number),
    all_applicable: applyUnionFilter(allUnionPockets, 'all_applicable', applicableTheoryCount).map((p) => p.number),
    top18: getTopNByAgreement(allUnionPockets, 18).map((p) => p.number),
  };
}
