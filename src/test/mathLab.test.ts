import { describe, expect, it } from 'vitest';
import {
  applyMultipleTestingCorrection,
  binomialPmf,
  calculateAutocorrelation,
  calculateBayesianSmoothedProbabilities,
  calculateChiSquareTest,
  calculateRunsTest,
  calculateShannonEntropy,
  chiSquarePValue,
  normalCdf,
  wilsonScoreInterval,
} from '../utils/mathLab';

describe('MathLab & Statistical Analysis Tests', () => {
  it('calculates normal CDF correctly', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  it('calculates Chi-Square p-values correctly', () => {
    // df = 1, x = 3.841 => p ~ 0.05
    const p1 = chiSquarePValue(3.841, 1);
    expect(p1).toBeCloseTo(0.05, 2);

    // df = 36 (EU wheel), x = 36 (equal to df) => p ~ 0.467
    const p36 = chiSquarePValue(36, 36);
    expect(p36).toBeGreaterThan(0.3);
    expect(p36).toBeLessThan(0.6);
  });

  it('calculates Binomial PMF correctly', () => {
    // Fair coin: n=10, k=5, p=0.5 => 252 * (0.5)^10 = 0.24609
    const pCoin = binomialPmf(10, 5, 0.5);
    expect(pCoin).toBeCloseTo(0.24609, 3);
  });

  it('calculates Wilson Score 95% Confidence Interval', () => {
    const ci = wilsonScoreInterval(50, 100, 0.95);
    expect(ci.pHat).toBe(0.5);
    expect(ci.lower).toBeGreaterThan(0.4);
    expect(ci.upper).toBeLessThan(0.6);
  });

  it('enforces sample size warning for Chi-Square test when N < 185', () => {
    const freqs: Record<string, number> = { '0': 2, '32': 1 };
    const res = calculateChiSquareTest(freqs, 'European', 3);
    expect(res.isSufficientSample).toBe(false);
    expect(res.isStatisticallySignificant).toBe(false);
    expect(res.warningMessage).toContain('Insufficient sample size');
  });

  it('calculates Shannon Entropy correctly', () => {
    // Equal frequencies across 37 numbers => max entropy
    const freqs: Record<string, number> = {};
    for (let i = 0; i <= 36; i++) freqs[i.toString()] = 10;
    const res = calculateShannonEntropy(freqs, 'European', 370);
    expect(res.normalizedEntropy).toBeCloseTo(1.0, 3);
    expect(res.shannonEntropy).toBeCloseTo(Math.log2(37), 3);
  });

  it('calculates Wald-Wolfowitz Runs Test on alternating sequence', () => {
    // Alternating R B R B R B (10 spins) => 10 runs
    const seq: (0 | 1)[] = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const res = calculateRunsTest(seq);
    expect(res.observedRuns).toBe(10);
    expect(res.expectedRuns).toBe(6);
    expect(res.zScore).toBeGreaterThan(2);
  });

  it('calculates autocorrelation at lag 1', () => {
    const series = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    const ac = calculateAutocorrelation(series, 2);
    expect(ac.length).toBe(2);
    expect(ac[0].autocorrelation).toBeLessThan(-0.8);
  });

  it('calculates Bayesian Dirichlet-Multinomial probabilities', () => {
    const freqs = { '0': 10, '32': 0 };
    const res = calculateBayesianSmoothedProbabilities(freqs, 'European', 10, 1.0);
    // Total N = 10, total prior alpha = 37 * 1 = 37 => denom = 47
    // Pocket 0 => (10 + 1) / 47 = 11/47 ~ 0.234
    // Pocket 32 => (0 + 1) / 47 = 1/47 ~ 0.021
    expect(res['0'].posteriorProbability).toBeCloseTo(11 / 47, 4);
    expect(res['32'].posteriorProbability).toBeCloseTo(1 / 47, 4);
  });

  it('applies Benjamini-Hochberg FDR correction', () => {
    const tests = [
      { id: '1', rawPValue: 0.001 },
      { id: '2', rawPValue: 0.04 },
      { id: '3', rawPValue: 0.20 },
    ];
    const corrected = applyMultipleTestingCorrection(tests, 0.05);
    expect(corrected.find((c) => c.id === '1')?.isSignificantFDR).toBe(true);
  });
});
