export type WheelType = 'European' | 'American';

export type PocketColor = 'red' | 'black' | 'green';

export interface SpinItem {
  id: string;
  sessionId: string;
  number: string; // '0', '00', '1'...'36'
  timestamp: number; // unix timestamp
  source: 'manual' | 'ocr_upload' | 'copy_paste' | 'screen_capture';
  snapshotId?: string; // snapshot created prior to this spin
}

export type PredictionEngineState =
  | 'NOT_STARTED'
  | 'INSUFFICIENT_HISTORY'
  | 'GENERATING'
  | 'AUTO_MODE_ACTIVE'
  | 'UPDATE_FAILED';

export interface RouletteSession {
  id: string;
  name: string;
  wheelType: WheelType;
  isAutoModeActive?: boolean;
  activationCutoffIndex?: number;
  pnlConfig?: PnlConfig;
  createdAt: number;
  updatedAt: number;
}


export interface AlgorithmWeights {
  frequency: number;   // 0 to 100
  recency: number;     // 0 to 100
  transition: number;  // 0 to 100
  sector: number;      // 0 to 100
  opposite: number;    // 0 to 100
}

export interface NumberCandidateScore {
  number: string;
  color: PocketColor;
  totalScore: number;
  freqScore: number;
  recencyScore: number;
  transitionScore: number;
  sectorScore: number;
  oppositeScore: number;
  rank: number;
  explanation: string;
}

export interface CategoryCandidate {
  categoryType: 'RedBlack' | 'Dozen' | 'Column' | 'OddEven' | 'HighLow';
  candidate: string; // e.g., 'Red', '1st Dozen', '2nd Column', 'Odd', 'High'
  confidence: number; // 0 to 100
  explanation: string;
}

export interface CandidatePrediction {
  id: string;
  sessionId: string;
  timestamp: number;
  spinIndex: number; // spin number index when prediction was generated
  candidateNumbers: string[]; // EXACTLY 18 distinct numbers
  candidateScores: NumberCandidateScore[];
  categoryCandidates: {
    redBlack: CategoryCandidate;
    dozen: CategoryCandidate;
    column: CategoryCandidate;
    oddEven: CategoryCandidate;
    highLow: CategoryCandidate;
  };
  weightsUsed: AlgorithmWeights;
  resolvedSpinId?: string;
  resolvedActualNumber?: string;
  hitNumber?: boolean;
  hitRedBlack?: boolean;
  hitDozen?: boolean;
  hitColumn?: boolean;
  hitOddEven?: boolean;
  hitHighLow?: boolean;
}

export interface StreakStats {
  maxRedStreak: number;
  maxBlackStreak: number;
  maxOddStreak: number;
  maxEvenStreak: number;
  repeatedPairs: { number: string; count: number }[];
  repeatedTriples: { number: string; count: number }[];
}

export interface StatisticalSummary {
  totalSpins: number;
  windowSize: number;
  lastSpin: string | null;
  frequencies: Record<string, number>;
  hotNumbers: { number: string; count: number; percentage: number }[];
  coldNumbers: { number: string; count: number; lastSeenAgo: number }[];
  categoryStats: {
    red: number;
    black: number;
    green: number;
    odd: number;
    even: number;
    high: number; // 19-36
    low: number;  // 1-18
    dozen1: number; // 1-12
    dozen2: number; // 13-24
    dozen3: number; // 25-36
    col1: number;
    col2: number;
    col3: number;
  };
  transitions: Record<string, Record<string, number>>; // number -> nextNumber -> count
  oppositePocketHits: { target: string; opposite: string; count: number }[];
  streaks: StreakStats;
}

export interface TrackingMetrics {
  totalPredictions: number;
  numberHits: number;
  numberHitRate: number; // %
  numberFairBaseline: number; // % (48.65% for EU 18/37, 47.37% for US 18/38)
  categoryMetrics: {
    redBlack: { hits: number; total: number; rate: number; baseline: number };
    dozen: { hits: number; total: number; rate: number; baseline: number };
    column: { hits: number; total: number; rate: number; baseline: number };
    oddEven: { hits: number; total: number; rate: number; baseline: number };
    highLow: { hits: number; total: number; rate: number; baseline: number };
  };
  performanceHistory: {
    spinIndex: number;
    actualNumber: string;
    hitNumber: boolean;
    cumulativeHitRate: number;
    baselineRate: number;
    snapshotId?: string;
    snapshotVersion?: number;
    snapshotTimestamp?: number;
    snapshotCutoff?: number;
    candidateNumbers?: string[];
    verificationStatus?: 'VERIFIED_HIT' | 'VERIFIED_MISS' | 'NOT_EVALUATED' | 'UNVERIFIED';
  }[];
}


export type CandidateUpdateStatus =
  | 'WAITING_FOR_RESULT'
  | 'RESULT_CONFIRMED'
  | 'CALCULATING'
  | 'NEXT_SPIN_READY'
  | 'UPDATE_FAILED';

export type EvaluationTargetFilter = 'top18' | 'all' | 'min2' | 'min4' | 'all_applicable';

export type PayoutFormat = 'total_return' | 'net_winnings';

export interface PnlConfig {
  gameName?: string;
  currency: string;
  startingBankroll?: number;
  payoutFormat: PayoutFormat;
  payoutValue?: number;
  stakePerNumber?: number;
  totalStakeBudget?: number;
  selectedCoverage: EvaluationTargetFilter;
  requestedCoverageCount?: number;
  pnlTrackingEnabled: boolean;
  isConfigured?: boolean;
}

export interface CoverageCalculationResult {
  requestedCount: number;
  availableCount: number;
  numberCount: number;
  isAvailable: boolean;
  stakePerNumber: number;
  totalStake: number;
  coveredReturn: number;
  possibleNetProfit: number;
  possibleNetLoss: number;
  statusText: string;
  coveredNumbers: string[];
}

export interface PnlSnapshotData {
  config: PnlConfig;
  coveredNumbers: string[];
  coveredCount: number;
  stakePerNumber: number;
  totalStake: number;
  possibleCoveredReturn: number;
  possibleNetProfit: number;
  possibleNetLoss: number;
  isCoverageAvailable: boolean;
  statusMessage?: string;
  selectedPnl?: {
    coverage: string;
    numberCount: number;
    totalStake: number;
    stakePerNumber: number;
    coveredReturn: number;
    possibleNetProfit: number;
    possibleNetLoss: number;
    isAvailable: boolean;
  };
  table3?: {
    count18?: CoverageCalculationResult;
    count29?: CoverageCalculationResult;
    count30?: CoverageCalculationResult;
  };
}

export interface PnlEvaluationRecord {
  spinId: string;
  spinNumber: string;
  spinIndex: number;
  isCovered: boolean;
  coveredReturn: number;
  totalStake: number;
  stakePerNumber: number;
  payoutValue: number;
  realizedPnl: number;
  cumulativePnl: number;
  currentBankroll: number;
  snapshotVersion: number;
  currency: string;
}

export interface PnlSummaryStats {
  latestRealizedPnl: number | null;
  cumulativePnl: number;
  currentBankroll: number;
  startingBankroll: number;
  totalPnlSpins: number;
  totalEvaluatedSpins?: number;
  totalWinningSpins: number;
  totalLosingSpins: number;
  currency: string;
  isConfigured?: boolean;
}

export interface CandidateSnapshotRecord {
  id: string;
  sessionId: string;
  version: number;
  spinCutoffIndex: number;
  spinCutoffId: string | null;
  timestamp: number;
  allUnionNumbers: string[];
  filterNumbers: {
    all: string[];
    min2: string[];
    min4: string[];
    all_applicable: string[];
    top18: string[];
  };
  targetFilter: EvaluationTargetFilter;
  targetNumbers: string[];
  targetSetSize: number;
  isRecalculatedUnchanged?: boolean;
  pnlData?: PnlSnapshotData;
}

export type EvaluationResult = 'HIT' | 'MISS' | 'NOT_EVALUATED' | 'UNVERIFIED';

export interface ConsolidatedEvaluationRecord {
  id: string;
  sessionId: string;
  spinId: string;
  spinNumber: string;
  spinIndex: number;
  snapshotId: string | null;
  snapshotVersion: number | null;
  snapshotCutoff?: number;
  snapshotTimestamp?: number;
  evaluatedFilter: EvaluationTargetFilter | null;
  evaluatedNumbers: string[];
  evaluatedSetSize: number;
  result: EvaluationResult;
  verificationStatus?: 'VERIFIED_HIT' | 'VERIFIED_MISS' | 'NOT_EVALUATED' | 'UNVERIFIED';
  currentStreak: number;
  longestStreak: number;
  timestamp: number;
  pnlRecord?: PnlEvaluationRecord | null;
}

export interface ConsolidatedPerformanceStats {
  latestSpinNumber: string | null;
  latestResult: EvaluationResult;
  currentStreak: number;
  longestStreak: number;
  totalEvaluatedSpins: number;
  totalHits: number;
  totalMisses: number;
  totalUnverified?: number;
  hitRatePercentage: number;
  latestEvaluatedVersion: number | null;
  latestEvaluatedSetSize: number;
  latestEvaluatedFilter: EvaluationTargetFilter | null;
  pnlSummary?: PnlSummaryStats;
}


