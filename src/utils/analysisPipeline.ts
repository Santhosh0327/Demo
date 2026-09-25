import { SpinItem, WheelType } from '../types/roulette';
import {
  CandidateEngineConfig,
  CandidateSnapshotRecord,
  generateExperimentalCandidates,
  CandidateMethodId,
} from './candidateEngineLab';
import {
  calculateCategoryMath,
  CategoryMathResult,
} from './categoryLab';
import {
  calculateChiSquareTest,
  calculateShannonEntropy,
  calculateRunsTest,
  calculateAutocorrelation,
  calculateBayesianSmoothedProbabilities,
  calculateBootstrapProportionCI,
  ChiSquareResult,
  EntropyResult,
  RunsTestResult,
  AutocorrelationResult,
} from './mathLab';
import {
  calculateCircularStats,
  calculateConsecutiveWheelDistanceDistribution,
  calculateCircularKDE,
  calculateSectorAnalysis,
  CircularStatsResult,
  WheelDistanceDistribution,
  SectorAnalysisResult,
} from './wheelLab';
import {
  runMonteCarloSimulations,
  MonteCarloSummaryResult,
  SimulationParams,
} from './simulatorLab';
import { computeTrackingMetrics } from './tracking';
import { CandidatePrediction, TrackingMetrics } from '../types/roulette';

export interface InstantAnalysisResults {
  timestamp: number;
  totalSpins: number;
  historyCutoff: number;
  wheelType: WheelType;
  calculationDurationMs: number;
  status: 'complete' | 'insufficient_history';
  
  // Main & All 8 Candidate Methods
  mainCandidateSnapshot: CandidateSnapshotRecord;
  allCandidateMethods: Record<CandidateMethodId, CandidateSnapshotRecord>;
  
  // Strategy Groups
  categoryAnalysis: CategoryMathResult;
  chiSquare: ChiSquareResult;
  entropy: EntropyResult;
  runsTest: RunsTestResult;
  autocorrelation: AutocorrelationResult[];
  bayesianSmoothed: Record<string, { count: number; rawProbability: number; posteriorProbability: number }>;
  
  // Wheel Physics
  circularStats: CircularStatsResult;
  wheelDistances: WheelDistanceDistribution;
  circularKDE: { pocket: string; index: number; density: number; normalizedDensity: number }[];
  sectorAnalysis: SectorAnalysisResult[];
  
  // Performance Tracking
  trackingMetrics: TrackingMetrics;
}

export interface HeavyAsyncAnalysisResults {
  timestamp: number;
  calculationId: number;
  status: 'idle' | 'calculating' | 'complete' | 'stale';
  monteCarloSummary?: MonteCarloSummaryResult;
  bootstrapHitRateCI?: { meanHitRate: number; lowerCI: number; upperCI: number };
}

let activeCalculationSeq = 0;

/**
  Executes near-instant lightweight mathematical calculations on current spin history.
 */
export function runInstantAnalysisPipeline(
  spins: SpinItem[],
  wheelType: WheelType,
  predictions: CandidatePrediction[],
  activeMethod: CandidateMethodId = 'weighted_ensemble',
  historyWindow: number = 100
): InstantAnalysisResults {
  const startTime = performance.now();
  const spinNumbers = spins.map((s) => s.number);
  const cutoffSpins = spinNumbers.slice(-historyWindow);
  const N = cutoffSpins.length;

  const baseConfig: CandidateEngineConfig = {
    method: activeMethod,
    minSpinsRequired: 1,
    historyCutoff: historyWindow,
    wheelType,
  };

  // Generate main candidate set
  const mainSnapshot = generateExperimentalCandidates(spinNumbers, baseConfig);

  // Generate all 8 candidate sets for side-by-side strategy comparison
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

  const allCandidateMethods: Record<CandidateMethodId, CandidateSnapshotRecord> = {} as any;
  methods.forEach((m) => {
    allCandidateMethods[m] = generateExperimentalCandidates(spinNumbers, {
      ...baseConfig,
      method: m,
    });
  });

  // Category Analysis
  const categoryAnalysis = calculateCategoryMath(cutoffSpins, wheelType);

  // Statistics
  const frequencies: Record<string, number> = {};
  cutoffSpins.forEach((num) => {
    frequencies[num] = (frequencies[num] || 0) + 1;
  });

  const chiSquare = calculateChiSquareTest(frequencies, wheelType, N);
  const entropy = calculateShannonEntropy(frequencies, wheelType, N);
  
  // Encoded binary sequence for Red/Black runs test
  const redBlackSequence: (0 | 1)[] = cutoffSpins
    .filter((n) => n !== '0' && n !== '00')
    .map((n) => {
      const redNums = ['1','3','5','7','9','12','14','16','18','19','21','23','25','27','30','32','34','36'];
      return redNums.includes(n) ? 1 : 0;
    });

  const runsTest = calculateRunsTest(redBlackSequence);

  const numericSeries = cutoffSpins.map((n) => (n === '00' ? -1 : parseInt(n, 10)));
  const autocorrelation = calculateAutocorrelation(numericSeries, 10);

  const bayesianSmoothed = calculateBayesianSmoothedProbabilities(frequencies, wheelType, N, 1.0);

  // Wheel Physics
  const circularStats = calculateCircularStats(cutoffSpins, wheelType);
  const wheelDistances = calculateConsecutiveWheelDistanceDistribution(cutoffSpins, wheelType);
  const circularKDE = calculateCircularKDE(cutoffSpins, wheelType, 4.0);
  const sectorAnalysis = calculateSectorAnalysis(cutoffSpins, wheelType);

  // Verified Performance Tracking
  const trackingMetrics = computeTrackingMetrics(predictions, wheelType);

  const duration = performance.now() - startTime;

  return {
    timestamp: Date.now(),
    totalSpins: spins.length,
    historyCutoff: N,
    wheelType,
    calculationDurationMs: Math.round(duration * 100) / 100,
    status: spins.length > 0 ? 'complete' : 'insufficient_history',
    mainCandidateSnapshot: mainSnapshot,
    allCandidateMethods,
    categoryAnalysis,
    chiSquare,
    entropy,
    runsTest,
    autocorrelation,
    bayesianSmoothed,
    circularStats,
    wheelDistances,
    circularKDE,
    sectorAnalysis,
    trackingMetrics,
  };
}

/**
 * Triggers heavy computations (Monte Carlo & Bootstrap) in an async process.
 * Discards outdated results if another spin arrives before completion.
 */
export function runHeavyAsyncAnalysis(
  spins: SpinItem[],
  wheelType: WheelType,
  predictions: CandidatePrediction[],
  onResult: (result: HeavyAsyncAnalysisResults) => void
): () => void {
  const calcId = ++activeCalculationSeq;

  // Signal calculating state immediately
  onResult({
    timestamp: Date.now(),
    calculationId: calcId,
    status: 'calculating',
  });

  const spinNumbers = spins.map((s) => s.number);

  // Run in asynchronous microtask/timer to unblock main thread
  const timeoutId = window.setTimeout(() => {
    // Check if stale before executing
    if (calcId !== activeCalculationSeq) {
      return;
    }

    const simParams: SimulationParams = {
      systemId: 'fixed_18_numbers',
      targetBetType: '18_numbers',
      initialBankroll: 1000,
      baseUnit: 1,
      minBet: 1,
      maxBet: 500,
      wheelType,
      zeroRule: 'standard',
      custom18Numbers: spinNumbers.slice(-18),
    };

    const monteCarloSummary = runMonteCarloSimulations(simParams, 50, 50);

    const hitSequence = predictions
      .filter((p) => p.hitNumber !== undefined)
      .map((p) => !!p.hitNumber);

    const bootstrapHitRateCI = calculateBootstrapProportionCI(hitSequence, 500, 0.95);

    // Final check for staleness
    if (calcId === activeCalculationSeq) {
      onResult({
        timestamp: Date.now(),
        calculationId: calcId,
        status: 'complete',
        monteCarloSummary,
        bootstrapHitRateCI,
      });
    }
  }, 30);

  // Return cancellation cleanup function
  return () => {
    clearTimeout(timeoutId);
  };
}
