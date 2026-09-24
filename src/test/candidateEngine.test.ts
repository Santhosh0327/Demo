import { describe, it, expect } from 'vitest';
import { generateCandidatePrediction, MIN_HISTORY_REQUIRED } from '../utils/candidateEngine';
import { SpinItem } from '../types/roulette';

describe('Candidate Prediction Engine & Minimum History Requirement', () => {
  const dummySpins: SpinItem[] = [
    { id: '1', sessionId: 's1', number: '17', timestamp: 1000, source: 'manual' },
    { id: '2', sessionId: 's1', number: '34', timestamp: 2000, source: 'manual' },
    { id: '3', sessionId: 's1', number: '6', timestamp: 3000, source: 'manual' },
    { id: '4', sessionId: 's1', number: '27', timestamp: 4000, source: 'manual' },
    { id: '5', sessionId: 's1', number: '34', timestamp: 5000, source: 'manual' },
    { id: '6', sessionId: 's1', number: '17', timestamp: 6000, source: 'manual' },
  ];

  it('returns null when history is below MIN_HISTORY_REQUIRED (3 spins)', () => {
    const insufficientSpins = dummySpins.slice(0, 2);
    const pred = generateCandidatePrediction(insufficientSpins, 'European');
    expect(pred).toBeNull();
  });

  it('generates EXACTLY 18 distinct candidate numbers for European Roulette when history >= 3', () => {
    const pred = generateCandidatePrediction(dummySpins, 'European');
    expect(pred).not.toBeNull();
    expect(pred!.candidateNumbers.length).toBe(18);
    const unique = new Set(pred!.candidateNumbers);
    expect(unique.size).toBe(18);
  });

  it('generates EXACTLY 18 distinct candidate numbers for American Roulette when history >= 3', () => {
    const pred = generateCandidatePrediction(dummySpins, 'American');
    expect(pred).not.toBeNull();
    expect(pred!.candidateNumbers.length).toBe(18);
    const unique = new Set(pred!.candidateNumbers);
    expect(unique.size).toBe(18);
  });

  it('correctly scores transitions (e.g. 17 was followed by 34)', () => {
    const pred = generateCandidatePrediction(dummySpins, 'European');
    // Last spin is 17. In dummySpins, 17 was followed by 34.
    const cand34 = pred!.candidateScores.find((c) => c.number === '34');
    expect(cand34).toBeDefined();
    expect(cand34!.transitionScore).toBeGreaterThan(0);
  });

  it('generates all 5 category forecasts with rationale from actual history', () => {
    const pred = generateCandidatePrediction(dummySpins, 'European');
    expect(pred!.categoryCandidates.redBlack.candidate).toBeDefined();
    expect(pred!.categoryCandidates.dozen.candidate).toBeDefined();
    expect(pred!.categoryCandidates.column.candidate).toBeDefined();
    expect(pred!.categoryCandidates.oddEven.candidate).toBeDefined();
    expect(pred!.categoryCandidates.highLow.candidate).toBeDefined();
  });
});
