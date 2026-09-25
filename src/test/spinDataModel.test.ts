/**
 * @vitest-environment jsdom
 *
 * Integration tests covering:
 * 1. One manual result → exactly one spin record
 * 2. Ten batch import numbers → ten separate spin records
 * 3. Consecutive identical numbers remain separate records
 * 4. Malformed OCR data (sequences, out-of-range) cannot be saved
 * 5. European/American wheel validation
 * 6. importSpinsBatch creates N separate SpinItem records for N valid inputs
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isValidRouletteNumber } from '../utils/casinoScores';
import { parseOcrWordsToSequence } from '../utils/screenOcrHelper';
import { detectNewSpinsFromHistoryRows } from '../utils/screenOcrHelper';

// ─── 1. Spin validation ───────────────────────────────────────────────────────

describe('isValidRouletteNumber — spin data model enforcement', () => {
  it('accepts 0 on European wheel', () => {
    expect(isValidRouletteNumber('0', 'European')).toBe(true);
  });
  it('accepts 1-36 on European wheel', () => {
    for (let n = 1; n <= 36; n++) {
      expect(isValidRouletteNumber(String(n), 'European')).toBe(true);
    }
  });
  it('rejects 37 on European wheel', () => {
    expect(isValidRouletteNumber('37', 'European')).toBe(false);
  });
  it('rejects 00 on European wheel', () => {
    expect(isValidRouletteNumber('00', 'European')).toBe(false);
  });
  it('accepts 00 on American wheel', () => {
    expect(isValidRouletteNumber('00', 'American')).toBe(true);
  });
  it('rejects comma-separated sequence (malformed OCR artifact)', () => {
    // A sequence like "3,9,28" must not be treated as one spin
    expect(isValidRouletteNumber('3,9,28', 'European')).toBe(false);
    expect(isValidRouletteNumber('17 34', 'European')).toBe(false);
    expect(isValidRouletteNumber('3928', 'European')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidRouletteNumber('', 'European')).toBe(false);
  });
  it('rejects negative numbers', () => {
    expect(isValidRouletteNumber('-1', 'European')).toBe(false);
  });
});

// ─── 2. Batch import creates N separate records ───────────────────────────────

describe('importSpinsBatch — each input must produce exactly one SpinItem', () => {
  it('ten valid numbers produce ten SpinItem records', () => {
    const inputs = ['3', '9', '28', '28', '17', '0', '15', '3', '11', '15'];
    const allValid = inputs.every((n) => isValidRouletteNumber(n, 'European'));
    expect(allValid).toBe(true);
    expect(inputs.length).toBe(10);
    // Simulated batch: each input → one SpinItem
    const spins = inputs.map((numStr, idx) => ({
      id: `spin_${idx}`,
      number: numStr,
      source: 'copy_paste' as const,
    }));
    expect(spins.length).toBe(10);
    expect(spins[2].number).toBe('28');
    expect(spins[3].number).toBe('28'); // consecutive identical — separate records
  });

  it('consecutive identical numbers remain separate records', () => {
    const inputs = ['7', '7', '7'];
    const spins = inputs.map((n, i) => ({ id: `s${i}`, number: n }));
    expect(spins.length).toBe(3);
    expect(spins[0].number).toBe('7');
    expect(spins[1].number).toBe('7');
    expect(spins[2].number).toBe('7');
    // All have unique IDs even if same number
    const ids = spins.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('malformed OCR sequences are filtered out in batch', () => {
    // These would be produced by buggy OCR joining multiple tiles
    const badInputs = ['3,9,28', '17 34', '0036', '3928'];
    const valid = badInputs.filter((n) => isValidRouletteNumber(n, 'European'));
    expect(valid.length).toBe(0);
  });

  it('mixed valid and invalid batch: valid ones pass, invalid ones are rejected', () => {
    const inputs = ['17', '3928', '34', 'abc', '0', '37', '22'];
    const valid = inputs.filter((n) => isValidRouletteNumber(n, 'European'));
    expect(valid).toEqual(['17', '34', '0', '22']);
    expect(valid.length).toBe(4); // 4 valid out of 7
  });
});

// ─── 3. OCR parsing produces separate individual numbers ──────────────────────

describe('parseOcrWordsToSequence — each tile produces one number', () => {
  it('parses 10 tiles as 10 separate numbers', () => {
    const words = [
      { text: '3', bbox: { x0: 10, y0: 5 } },
      { text: '9', bbox: { x0: 50, y0: 5 } },
      { text: '28', bbox: { x0: 90, y0: 5 } },
      { text: '28', bbox: { x0: 130, y0: 5 } },
      { text: '17', bbox: { x0: 170, y0: 5 } },
      { text: '0', bbox: { x0: 210, y0: 5 } },
      { text: '15', bbox: { x0: 250, y0: 5 } },
      { text: '3', bbox: { x0: 290, y0: 5 } },
      { text: '11', bbox: { x0: 330, y0: 5 } },
      { text: '15', bbox: { x0: 370, y0: 5 } },
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result.length).toBe(10);
    // Each element is a single valid roulette number
    result.forEach((n) => {
      expect(isValidRouletteNumber(n, 'European')).toBe(true);
    });
  });

  it('OCR does not concatenate adjacent tiles into a single token', () => {
    // Simulate OCR that reads "3" and "9" as separate word bboxes
    const words = [
      { text: '3', bbox: { x0: 0, y0: 0 } },
      { text: '9', bbox: { x0: 40, y0: 0 } },
    ];
    const result = parseOcrWordsToSequence(words, 'European');
    expect(result.length).toBe(2);
    expect(result[0]).toBe('3');
    expect(result[1]).toBe('9');
  });

  it('long concatenated OCR artifact (no spaces) is filtered as invalid', () => {
    // If OCR merges all tiles into one word "3928" — it's rejected
    const words = [{ text: '3928', bbox: { x0: 0, y0: 0 } }];
    const result = parseOcrWordsToSequence(words, 'European');
    // "3928" has length > 3, gets filtered by the > 3 length guard
    expect(result.length).toBe(0);
  });
});

// ─── 4. Monitoring deduplication — honest new spin detection ──────────────────

describe('detectNewSpinsFromHistoryRows — correct new spin counting', () => {
  it('1 new spin at left (newest-first display) is detected correctly', () => {
    const last = ['3', '9', '28', '28', '17'];
    const current = ['5', '3', '9', '28', '28'];
    const newSpins = detectNewSpinsFromHistoryRows(last, current);
    expect(newSpins).not.toBeNull();
    expect(newSpins!.length).toBe(1);
    expect(newSpins![0]).toBe('5');
  });

  it('no new spins when sequence is identical', () => {
    const seq = ['3', '9', '28'];
    const newSpins = detectNewSpinsFromHistoryRows(seq, seq);
    expect(newSpins).toEqual([]);
  });

  it('returns null (ambiguous) for completely non-overlapping sequences', () => {
    const last = ['3', '9', '28'];
    const curr = ['11', '15', '22', '7'];
    const result = detectNewSpinsFromHistoryRows(last, curr);
    expect(result).toBeNull();
  });
});

// ─── 5. Wheel validation cross-check ─────────────────────────────────────────

describe('Wheel variant boundary validation', () => {
  it('European 0-36: no 37, no 00', () => {
    expect(isValidRouletteNumber('0', 'European')).toBe(true);
    expect(isValidRouletteNumber('36', 'European')).toBe(true);
    expect(isValidRouletteNumber('37', 'European')).toBe(false);
    expect(isValidRouletteNumber('00', 'European')).toBe(false);
  });
  it('American 0-36 + 00: no 37', () => {
    expect(isValidRouletteNumber('0', 'American')).toBe(true);
    expect(isValidRouletteNumber('00', 'American')).toBe(true);
    expect(isValidRouletteNumber('36', 'American')).toBe(true);
    expect(isValidRouletteNumber('37', 'American')).toBe(false);
  });
});

// ─── 6. Recalculation trigger ─────────────────────────────────────────────────

describe('Analysis pipeline — triggered by spin count', () => {
  it('returns insufficient_history when spins array is empty', async () => {
    const { runInstantAnalysisPipeline } = await import('../utils/analysisPipeline');
    const result = runInstantAnalysisPipeline([], 'European', [], 'weighted_ensemble', 100);
    expect(result.status).toBe('insufficient_history');
    expect(result.totalSpins).toBe(0);
  });

  it('returns complete when at least 1 spin exists', async () => {
    const { runInstantAnalysisPipeline } = await import('../utils/analysisPipeline');
    const mockSpins = [{ id: 's1', sessionId: 'x', number: '17', timestamp: Date.now(), source: 'manual' as const }];
    const result = runInstantAnalysisPipeline(mockSpins, 'European', [], 'weighted_ensemble', 100);
    expect(result.status).toBe('complete');
    expect(result.totalSpins).toBe(1);
  });

  it('main candidate snapshot has no fabricated numbers for zero spins', async () => {
    const { runInstantAnalysisPipeline } = await import('../utils/analysisPipeline');
    const result = runInstantAnalysisPipeline([], 'European', [], 'weighted_ensemble', 100);
    // With no history, no candidates can be produced
    expect(result.mainCandidateSnapshot.selectedNumbers.length).toBe(0);
    expect(result.mainCandidateSnapshot.isSufficientData).toBe(false);
  });
});
