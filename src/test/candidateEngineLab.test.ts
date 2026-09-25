import { describe, expect, it } from 'vitest';
import {
  CandidateMethodId,
  generateExperimentalCandidates,
  selectByFrequency,
  selectByRecency,
} from '../utils/candidateEngineLab';

describe('CandidateEngineLab Experimental 18-Number Engine Tests', () => {
  const sampleSpins = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  ];

  it('guarantees EXACTLY 18 distinct valid numbers when min data is met', () => {
    const methods: CandidateMethodId[] = [
      'frequency',
      'recency',
      'transition',
      'wheel_neighbour',
      'opposite_pocket',
      'sector',
      'bayesian',
      'weighted_ensemble',
    ];

    methods.forEach((method) => {
      const snap = generateExperimentalCandidates(sampleSpins, {
        method,
        minSpinsRequired: 10,
        historyCutoff: 20,
        wheelType: 'European',
      });

      expect(snap.isSufficientData).toBe(true);
      expect(snap.selectedNumbers.length).toBe(18);
      const unique = new Set(snap.selectedNumbers);
      expect(unique.size).toBe(18);
    });
  });

  it('returns empty candidate set when sample size < minSpinsRequired', () => {
    const snap = generateExperimentalCandidates(['1', '2'], {
      method: 'frequency',
      minSpinsRequired: 10,
      historyCutoff: 10,
      wheelType: 'European',
    });

    expect(snap.isSufficientData).toBe(false);
    expect(snap.selectedNumbers.length).toBe(0);
  });

  it('performs deterministic tie-breaking', () => {
    // With equal frequency 0 across all numbers, frequency selection should be 100% deterministic
    const res1 = selectByFrequency(sampleSpins, 'European', 5);
    const res2 = selectByFrequency(sampleSpins, 'European', 5);
    expect(res1).toEqual(res2);
  });
});
