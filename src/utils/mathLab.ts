import { WheelType } from '../types/roulette';
import { getAllWheelNumbers } from './rouletteRules';

/**
 * Standard Normal Cumulative Distribution Function Phi(z)
 */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 +
      t *
      (-0.356563782 +
        t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Lower Incomplete Gamma Function P(a, x) = gamma(a, x) / Gamma(a)
 * Series expansion for x < a + 1
 */
function incompleteGammaLower(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x > 200) return 1;

  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (term < sum * 1e-12) break;
  }
  const logGammaA = logGamma(a);
  const val = Math.exp(a * Math.log(x) - x - logGammaA) * sum;
  return Math.min(1, Math.max(0, val));
}

/**
 * Log Gamma function approximation (Lanczos)
 */
export function logGamma(z: number): number {
  const p = [
    676.5203681218851,
    -1259.1392167228336,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Chi-Square Cumulative Distribution Function P(X <= x)
 * for k degrees of freedom
 */
export function chiSquareCdf(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 0;
  return incompleteGammaLower(df / 2, x / 2);
}

/**
 * Chi-Square p-value P(X >= x) = 1 - CDF
 */
export function chiSquarePValue(x: number, df: number): number {
  return Math.max(0, 1 - chiSquareCdf(x, df));
}

/**
 * Binomial PMF P(X = k) = nCk * p^k * (1-p)^(n-k)
 */
export function binomialPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n || p < 0 || p > 1) return 0;
  if (k === 0) return Math.pow(1 - p, n);
  if (k === n) return Math.pow(p, n);

  const logComb = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  const logProb = logComb + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

/**
 * Binomial CDF P(X <= k)
 */
export function binomialCdf(n: number, k: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += binomialPmf(n, i, p);
  }
  return Math.min(1, sum);
}

/**
 * Wilson Score 95% Confidence Interval for proportion p = k / n
 */
export function wilsonScoreInterval(k: number, n: number, confidence: number = 0.95): {
  pHat: number;
  lower: number;
  upper: number;
  center: number;
  marginOfError: number;
} {
  if (n <= 0) {
    return { pHat: 0, lower: 0, upper: 0, center: 0, marginOfError: 0 };
  }
  const pHat = k / n;

  // standard normal z for 95% is ~1.96, 99% is ~2.576, 90% is ~1.645
  let z = 1.95996;
  if (confidence >= 0.99) z = 2.57583;
  else if (confidence <= 0.90) z = 1.64485;

  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (pHat + z2 / (2 * n)) / denom;
  const factor = z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n);
  const marginOfError = factor / denom;

  const lower = Math.max(0, center - marginOfError);
  const upper = Math.min(1, center + marginOfError);

  return { pHat, lower, upper, center, marginOfError };
}

/**
 * Chi-Square Goodness-of-Fit Test on Spin Frequencies
 */
export interface ChiSquareResult {
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  isSufficientSample: boolean;
  expectedFrequencyPerNumber: number;
  minRequiredSample: number;
  warningMessage?: string;
  isStatisticallySignificant: boolean; // alpha = 0.05
}

export function calculateChiSquareTest(
  frequencies: Record<string, number>,
  wheelType: WheelType,
  totalSpins: number
): ChiSquareResult {
  const allNumbers = getAllWheelNumbers(wheelType);
  const k = allNumbers.length; // 37 or 38
  const expected = totalSpins / k;
  const minRequiredSample = k * 5; // e.g. 185 for EU, 190 for US

  let chiSquare = 0;
  allNumbers.forEach((num) => {
    const obs = frequencies[num] || 0;
    chiSquare += Math.pow(obs - expected, 2) / (expected > 0 ? expected : 1);
  });

  const df = k - 1;
  const pValue = chiSquarePValue(chiSquare, df);
  const isSufficientSample = totalSpins >= minRequiredSample && expected >= 5;

  const isSignificant = isSufficientSample && pValue < 0.05;

  let warningMessage: string | undefined;
  if (!isSufficientSample) {
    warningMessage = `Insufficient sample size (N = ${totalSpins}). Standard Chi-Square assumption requires expected frequency >= 5 per pocket (minimum N = ${minRequiredSample}). Statistical significance cannot be asserted.`;
  }

  return {
    chiSquare,
    degreesOfFreedom: df,
    pValue,
    isSufficientSample,
    expectedFrequencyPerNumber: expected,
    minRequiredSample,
    warningMessage,
    isStatisticallySignificant: isSignificant,
  };
}

/**
 * Shannon Entropy calculation H(X) in bits
 */
export interface EntropyResult {
  shannonEntropy: number; // in bits
  maxPossibleEntropy: number; // log2(K)
  normalizedEntropy: number; // 0 to 1
  uniformityPercentage: number; // normalized * 100
}

export function calculateShannonEntropy(
  frequencies: Record<string, number>,
  wheelType: WheelType,
  totalSpins: number
): EntropyResult {
  const allNumbers = getAllWheelNumbers(wheelType);
  const K = allNumbers.length;
  const maxH = Math.log2(K);

  if (totalSpins <= 0) {
    return {
      shannonEntropy: maxH,
      maxPossibleEntropy: maxH,
      normalizedEntropy: 1.0,
      uniformityPercentage: 100,
    };
  }

  let H = 0;
  allNumbers.forEach((num) => {
    const count = frequencies[num] || 0;
    if (count > 0) {
      const p = count / totalSpins;
      H -= p * Math.log2(p);
    }
  });

  const normalized = H / maxH;
  return {
    shannonEntropy: H,
    maxPossibleEntropy: maxH,
    normalizedEntropy: normalized,
    uniformityPercentage: normalized * 100,
  };
}

/**
 * Wald-Wolfowitz Runs Test for temporal independence on binary sequence
 */
export interface RunsTestResult {
  totalSpins: number;
  n1: number; // Count of Category 1 (e.g. Red)
  n2: number; // Count of Category 2 (e.g. Black)
  observedRuns: number;
  expectedRuns: number;
  variance: number;
  zScore: number;
  pValue: number;
  isIndependentAtAlpha05: boolean;
  isValidSample: boolean;
  warningMessage?: string;
}

export function calculateRunsTest(sequence: (0 | 1)[]): RunsTestResult {
  const N = sequence.length;
  if (N < 10) {
    return {
      totalSpins: N,
      n1: 0,
      n2: 0,
      observedRuns: 0,
      expectedRuns: 0,
      variance: 0,
      zScore: 0,
      pValue: 1,
      isIndependentAtAlpha05: true,
      isValidSample: false,
      warningMessage: 'Sequence too short (N < 10) for Wald-Wolfowitz runs test.',
    };
  }

  let n1 = 0;
  let n2 = 0;
  sequence.forEach((val) => {
    if (val === 1) n1++;
    else n2++;
  });

  if (n1 === 0 || n2 === 0) {
    return {
      totalSpins: N,
      n1,
      n2,
      observedRuns: 1,
      expectedRuns: 1,
      variance: 0,
      zScore: 0,
      pValue: 0,
      isIndependentAtAlpha05: false,
      isValidSample: false,
      warningMessage: 'One category has zero observations in runs test.',
    };
  }

  let runs = 1;
  for (let i = 1; i < N; i++) {
    if (sequence[i] !== sequence[i - 1]) {
      runs++;
    }
  }

  const expectedRuns = 1 + (2 * n1 * n2) / N;
  const numVar = 2 * n1 * n2 * (2 * n1 * n2 - N);
  const denVar = N * N * (N - 1);
  const variance = denVar > 0 ? numVar / denVar : 0;
  const stdDev = Math.sqrt(variance);

  const zScore = stdDev > 0 ? (runs - expectedRuns) / stdDev : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

  const isValidSample = n1 >= 10 && n2 >= 10;
  const isIndependent = pValue >= 0.05;

  return {
    totalSpins: N,
    n1,
    n2,
    observedRuns: runs,
    expectedRuns,
    variance,
    zScore,
    pValue,
    isIndependentAtAlpha05: isIndependent,
    isValidSample,
    warningMessage: !isValidSample
      ? 'Category counts < 10; asymptotic normal approximation for runs test may be imprecise.'
      : undefined,
  };
}

/**
 * Autocorrelation at lag k for numeric or encoded series
 */
export interface AutocorrelationResult {
  lag: number;
  autocorrelation: number;
  standardError: number;
  zScore: number;
  pValue: number;
}

export function calculateAutocorrelation(series: number[], maxLag: number = 10): AutocorrelationResult[] {
  const N = series.length;
  if (N <= maxLag + 2) return [];

  const mean = series.reduce((a, b) => a + b, 0) / N;
  let variance = 0;
  for (let i = 0; i < N; i++) {
    variance += Math.pow(series[i] - mean, 2);
  }
  if (variance === 0) return [];

  const results: AutocorrelationResult[] = [];
  const se = 1 / Math.sqrt(N);

  for (let k = 1; k <= maxLag; k++) {
    let cov = 0;
    for (let i = 0; i < N - k; i++) {
      cov += (series[i] - mean) * (series[i + k] - mean);
    }
    const r = cov / variance;
    const z = r / se;
    const pValue = 2 * (1 - normalCdf(Math.abs(z)));

    results.push({
      lag: k,
      autocorrelation: r,
      standardError: se,
      zScore: z,
      pValue,
    });
  }

  return results;
}

/**
 * Bayesian Dirichlet-Multinomial Smoothing
 * Posterior mean probability: p_i = (count_i + alpha_i) / (N + sum(alpha))
 */
export function calculateBayesianSmoothedProbabilities(
  frequencies: Record<string, number>,
  wheelType: WheelType,
  totalSpins: number,
  priorAlpha: number = 1.0 // 1.0 = Laplace uniform prior, 0.5 = Jeffreys, 1/K = Perks
): Record<string, { count: number; rawProbability: number; posteriorProbability: number }> {
  const allNumbers = getAllWheelNumbers(wheelType);
  const K = allNumbers.length;
  const totalAlpha = priorAlpha * K;
  const denom = totalSpins + totalAlpha;

  const result: Record<string, { count: number; rawProbability: number; posteriorProbability: number }> = {};

  allNumbers.forEach((num) => {
    const count = frequencies[num] || 0;
    const rawProb = totalSpins > 0 ? count / totalSpins : 1 / K;
    const posteriorProb = (count + priorAlpha) / denom;
    result[num] = {
      count,
      rawProbability: rawProb,
      posteriorProbability: posteriorProb,
    };
  });

  return result;
}

/**
 * Benjamini-Hochberg Multiple Testing Correction (FDR)
 */
export interface MultipleTestingItem {
  id: string;
  rawPValue: number;
  adjustedPValue: number;
  isSignificantFDR: boolean;
  isSignificantBonferroni: boolean;
}

export function applyMultipleTestingCorrection(
  items: { id: string; rawPValue: number }[],
  alpha: number = 0.05
): MultipleTestingItem[] {
  const m = items.length;
  if (m === 0) return [];

  // Sort items by raw p-value ascending
  const sorted = [...items].map((item, originalIndex) => ({ ...item, originalIndex })).sort((a, b) => a.rawPValue - b.rawPValue);

  const bonferroniAlpha = alpha / m;

  // BH step
  // adjusted p-value for rank k: p_adj = min(1, p_raw * m / k) step down from right
  const bhAdjusted: number[] = new Array(m);
  let minP = 1.0;
  for (let i = m - 1; i >= 0; i--) {
    const k = i + 1;
    const pAdj = Math.min(1, (sorted[i].rawPValue * m) / k);
    minP = Math.min(minP, pAdj);
    bhAdjusted[i] = minP;
  }

  const result: MultipleTestingItem[] = new Array(m);
  for (let i = 0; i < m; i++) {
    const origIdx = sorted[i].originalIndex;
    result[origIdx] = {
      id: sorted[i].id,
      rawPValue: sorted[i].rawPValue,
      adjustedPValue: bhAdjusted[i],
      isSignificantFDR: bhAdjusted[i] < alpha,
      isSignificantBonferroni: sorted[i].rawPValue < bonferroniAlpha,
    };
  }

  return result;
}

/**
 * Non-parametric Bootstrap Confidence Intervals
 */
export function calculateBootstrapProportionCI(
  sequence: boolean[],
  numResamples: number = 1000,
  confidenceLevel: number = 0.95
): { meanHitRate: number; lowerCI: number; upperCI: number } {
  const N = sequence.length;
  if (N === 0) return { meanHitRate: 0, lowerCI: 0, upperCI: 0 };

  const bootstrapMeans: number[] = [];
  for (let b = 0; b < numResamples; b++) {
    let count = 0;
    for (let i = 0; i < N; i++) {
      const randIdx = Math.floor(Math.random() * N);
      if (sequence[randIdx]) count++;
    }
    bootstrapMeans.push(count / N);
  }

  bootstrapMeans.sort((a, b) => a - b);
  const alphaHalf = (1 - confidenceLevel) / 2;
  const lowerIdx = Math.floor(alphaHalf * numResamples);
  const upperIdx = Math.ceil((1 - alphaHalf) * numResamples) - 1;

  const mean = sequence.filter(Boolean).length / N;
  return {
    meanHitRate: mean,
    lowerCI: bootstrapMeans[Math.max(0, lowerIdx)],
    upperCI: bootstrapMeans[Math.min(numResamples - 1, upperIdx)],
  };
}
