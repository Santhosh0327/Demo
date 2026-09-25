/**
 * @vitest-environment node
 *
 * Tests for theoryUnion.ts:
 * 1. Each unique pocket appears exactly once in the union
 * 2. Agreement counts match actual theory membership
 * 3. Unavailable theories do not inflate agreement counts
 * 4. Filters work correctly and return honest counts
 * 5. Top-N shortlist respects agreement order and actual count
 * 6. Deterministic sort: agreement desc, numeric asc
 */

import { describe, it, expect } from 'vitest';
import {
  buildTheoryUnion,
  applyUnionFilter,
  getTopNByAgreement,
  METHOD_ORDER,
} from '../utils/theoryUnion';
import { CandidateMethodId, CandidateSnapshotRecord, CANDIDATE_ENGINE_DISCLAIMER, LAB_MODEL_VERSION } from '../utils/candidateEngineLab';

// ─── Test fixture helpers ─────────────────────────────────────────────────────

function makeSnapshot(
  method: CandidateMethodId,
  numbers: string[],
  available: boolean = true
): CandidateSnapshotRecord {
  return {
    id: `snap_${method}`,
    timestamp: Date.now(),
    method,
    parameters: { method, minSpinsRequired: 1, historyCutoff: 100, wheelType: 'European' },
    sourceSessionId: 'test',
    historyCutoff: available ? 50 : 0,
    selectedNumbers: available ? numbers : [],
    isSufficientData: available,
    modelVersion: LAB_MODEL_VERSION,
    disclaimer: CANDIDATE_ENGINE_DISCLAIMER,
  };
}

/** Builds a Record with all 8 methods, using provided overrides */
function buildAllMethods(
  overrides: Partial<Record<CandidateMethodId, CandidateSnapshotRecord>>
): Record<CandidateMethodId, CandidateSnapshotRecord> {
  const defaults: Record<CandidateMethodId, CandidateSnapshotRecord> = {} as any;
  for (const m of METHOD_ORDER) {
    defaults[m] = overrides[m] ?? makeSnapshot(m, [], false);
  }
  return defaults;
}

// ─── 1. Each unique pocket appears exactly once ────────────────────────────────

describe('buildTheoryUnion — uniqueness invariant', () => {
  it('each pocket appears exactly once even when multiple theories agree on it', () => {
    const nums = Array.from({ length: 18 }, (_, i) => String(i + 1)); // 1-18
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', nums),
      recency: makeSnapshot('recency', nums), // identical set → same 18 pockets
    });

    const union = buildTheoryUnion(allMethods, 'European');

    // Every pocket in allUnionPockets must be unique
    const seen = new Set<string>();
    for (const entry of union.allUnionPockets) {
      expect(seen.has(entry.number)).toBe(false);
      seen.add(entry.number);
    }
    expect(union.allUnionPockets.length).toBe(18);
  });

  it('union grows when methods select different pockets', () => {
    const set1 = Array.from({ length: 18 }, (_, i) => String(i + 1));   // 1-18
    const set2 = Array.from({ length: 18 }, (_, i) => String(i + 19));  // 19-36
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', set1),
      recency: makeSnapshot('recency', set2),
    });

    const union = buildTheoryUnion(allMethods, 'European');
    expect(union.allUnionPockets.length).toBe(36);
  });
});

// ─── 2. Agreement counts match actual theory membership ───────────────────────

describe('buildTheoryUnion — agreement counts', () => {
  it('pocket in 2 theories has agreementCount=2', () => {
    const shared = Array.from({ length: 18 }, (_, i) => String(i + 1));
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', shared),
      recency: makeSnapshot('recency', shared),
    });

    const union = buildTheoryUnion(allMethods, 'European');
    expect(union.applicableTheoryCount).toBe(2);

    const pocket = union.allUnionPockets.find((p) => p.number === '7');
    expect(pocket).toBeDefined();
    expect(pocket!.agreementCount).toBe(2);
    expect(pocket!.theories.length).toBe(2);
    expect(pocket!.theories.map((t) => t.methodId)).toContain('frequency');
    expect(pocket!.theories.map((t) => t.methodId)).toContain('recency');
  });

  it('pocket in only 1 theory has agreementCount=1', () => {
    const set1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
    const set2 = ['19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', set1),
      recency: makeSnapshot('recency', set2),
    });

    const union = buildTheoryUnion(allMethods, 'European');
    const p1 = union.allUnionPockets.find((p) => p.number === '5');
    const p2 = union.allUnionPockets.find((p) => p.number === '25');
    expect(p1!.agreementCount).toBe(1);
    expect(p2!.agreementCount).toBe(1);
  });

  it('rank within method is 1-indexed and correct', () => {
    const nums = ['17', '3', '22', '0', '15', '9', '1', '27', '6', '11', '33', '5', '31', '18', '24', '2', '36', '14'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', nums),
    });

    const union = buildTheoryUnion(allMethods, 'European');
    const p = union.allUnionPockets.find((e) => e.number === '17');
    expect(p).toBeDefined();
    const theoryEntry = p!.theories.find((t) => t.methodId === 'frequency');
    expect(theoryEntry!.rankInMethod).toBe(1); // '17' is first in the list
  });
});

// ─── 3. Unavailable theories do not inflate agreement counts ──────────────────

describe('buildTheoryUnion — unavailable theory exclusion', () => {
  it('unavailable theories are not counted in applicableTheoryCount', () => {
    const nums = Array.from({ length: 18 }, (_, i) => String(i + 1));
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', nums),
      recency: makeSnapshot('recency', [], false),    // unavailable
      bayesian: makeSnapshot('bayesian', [], false),   // unavailable
    });

    const union = buildTheoryUnion(allMethods, 'European');
    expect(union.applicableTheoryCount).toBe(1);
    expect(union.unavailableTheoryIds).toContain('recency');
    expect(union.unavailableTheoryIds).toContain('bayesian');

    // Pocket agreement counts must not exceed applicable count (1)
    for (const entry of union.allUnionPockets) {
      expect(entry.agreementCount).toBeLessThanOrEqual(1);
    }
  });

  it('when zero theories are available, union is empty', () => {
    const allMethods = buildAllMethods({});
    const union = buildTheoryUnion(allMethods, 'European');
    expect(union.applicableTheoryCount).toBe(0);
    expect(union.allUnionPockets.length).toBe(0);
    expect(union.unavailableTheoryIds.length).toBe(8);
  });
});

// ─── 4. Filters ───────────────────────────────────────────────────────────────

describe('applyUnionFilter', () => {
  // Build a union with 3 applicable theories, overlapping on different subsets
  function buildTestUnion() {
    const set1 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18'];
    const set2 = ['1','2','3','4','5','6','7','8','9','19','20','21','22','23','24','25','26','27'];
    const set3 = ['1','2','3','4','5','6','28','29','30','31','32','33','34','35','36','0','15','16'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', set1),
      recency: makeSnapshot('recency', set2),
      transition: makeSnapshot('transition', set3),
    });
    return buildTheoryUnion(allMethods, 'European');
  }

  it('"all" filter returns all union pockets', () => {
    const union = buildTestUnion();
    const filtered = applyUnionFilter(union.allUnionPockets, 'all', union.applicableTheoryCount);
    expect(filtered.length).toBe(union.allUnionPockets.length);
  });

  it('"min2" filter returns only pockets in 2+ theories', () => {
    const union = buildTestUnion();
    const filtered = applyUnionFilter(union.allUnionPockets, 'min2', union.applicableTheoryCount);
    for (const p of filtered) {
      expect(p.agreementCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('"min4" filter with only 3 available theories returns empty', () => {
    const union = buildTestUnion();
    const filtered = applyUnionFilter(union.allUnionPockets, 'min4', union.applicableTheoryCount);
    // Max possible agreementCount is 3, so min4 must return nothing
    expect(filtered.length).toBe(0);
  });

  it('"all_applicable" filter returns only pockets in ALL applicable theories', () => {
    const union = buildTestUnion();
    const filtered = applyUnionFilter(union.allUnionPockets, 'all_applicable', union.applicableTheoryCount);
    for (const p of filtered) {
      expect(p.agreementCount).toBe(union.applicableTheoryCount);
    }
  });

  it('"all_applicable" with 0 applicable theories returns empty without error', () => {
    const allMethods = buildAllMethods({});
    const union = buildTheoryUnion(allMethods, 'European');
    const filtered = applyUnionFilter(union.allUnionPockets, 'all_applicable', 0);
    expect(filtered).toEqual([]);
  });
});

// ─── 5. Top-N shortlist ───────────────────────────────────────────────────────

describe('getTopNByAgreement', () => {
  it('returns top 18 sorted by agreement desc', () => {
    const set1 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18'];
    const set2 = ['1','2','3','4','5','6','7','8','9','19','20','21','22','23','24','25','26','27'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', set1),
      recency: makeSnapshot('recency', set2),
    });
    const union = buildTheoryUnion(allMethods, 'European');
    const top18 = getTopNByAgreement(union.allUnionPockets, 18);

    expect(top18.length).toBe(18);

    // Top 9 (1-9) should have agreement=2, rest should have agreement≤2
    const first = top18[0];
    expect(first.agreementCount).toBe(2);

    // Sort must be preserved: agreement desc
    for (let i = 1; i < top18.length; i++) {
      expect(top18[i].agreementCount).toBeLessThanOrEqual(top18[i - 1].agreementCount);
    }
  });

  it('returns actual count when fewer than N pockets exist', () => {
    const nums = ['1','2','3','4','5'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18']),
    });
    // Only 18 unique pockets total from 1 theory
    const union = buildTheoryUnion(allMethods, 'European');

    // Ask for top 30 → should return the actual count
    const top30 = getTopNByAgreement(union.allUnionPockets, 30);
    expect(top30.length).toBe(18); // only 18 unique pockets exist
  });
});

// ─── 6. Sort determinism ──────────────────────────────────────────────────────

describe('buildTheoryUnion — sort determinism', () => {
  it('ties broken by numeric ascending order', () => {
    // 2 theories each with different non-overlapping sets: all pockets have agreementCount=1
    const set1 = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18'];
    const set2 = ['19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36'];
    const allMethods = buildAllMethods({
      frequency: makeSnapshot('frequency', set1),
      recency: makeSnapshot('recency', set2),
    });

    const union = buildTheoryUnion(allMethods, 'European');
    // All 36 pockets have agreementCount=1 → tie-broken by numeric asc
    // '0' is not in either set, so '1' should come first
    expect(union.allUnionPockets[0].number).toBe('1');
    expect(union.allUnionPockets[35].number).toBe('36');
  });
});

// ─── 7. Invalid pocket values rejected from union ─────────────────────────────

describe('buildTheoryUnion — pocket validation guard', () => {
  it('pockets that fail isValidRouletteNumber are excluded from the union', () => {
    // Simulate a malformed snapshot with a sequence stored as one pocket
    const badSnap: CandidateSnapshotRecord = makeSnapshot(
      'frequency',
      // Intentionally inject malformed values that should be excluded
      ['17', '3,9,28', '22', '00', '5', '11', '8', '14', '27', '0', '33', '19', '6', '31', '2', '25', '16', '30'],
    );
    // Since '3,9,28' and '00' (on European) are invalid, the WHOLE snapshot should be
    // flagged as invalid by the guard in buildTheoryUnion
    const allMethods = buildAllMethods({ frequency: badSnap });
    const union = buildTheoryUnion(allMethods, 'European');

    // The snapshot has invalid values → the whole method is marked unavailable
    expect(union.unavailableTheoryIds).toContain('frequency');
    expect(union.applicableTheoryCount).toBe(0);
    expect(union.allUnionPockets.length).toBe(0);
  });
});
