import { CandidateMethodId } from '../utils/candidateEngineLab';
import {
  EvaluationTargetFilter,
  PnlEvaluationRecord,
  PnlSnapshotData,
  PnlSummaryStats,
  WheelType,
} from './roulette';

export type TheoryOutcomeResult = 'HIT' | 'MISS' | 'NOT_EVALUATED';

export interface TheorySnapshotRecord {
  id: string;
  sessionId: string;
  methodId: CandidateMethodId;
  methodName: string;
  version: number;
  spinCutoffIndex: number;
  spinCutoffId: string | null;
  timestamp: number;
  candidateNumbers: string[];
  candidateCount: number;
  historyCutoff: number;
  isSufficientData: boolean;
  pnlData?: PnlSnapshotData;
}

export interface TheoryEvaluationRecord {
  id: string;
  sessionId: string;
  methodId: CandidateMethodId;
  spinId: string;
  spinNumber: string;
  spinIndex: number;
  snapshotId: string;
  snapshotVersion: number;
  snapshotCutoff: number;
  snapshotTimestamp: number;
  candidateNumbers: string[];
  candidateCount: number;
  result: TheoryOutcomeResult;
  currentStreak: number;
  longestStreak: number;
  timestamp: number;
  runningHits: number;
  runningTotal: number;
  runningHitRate: number;
  pnlRecord?: PnlEvaluationRecord | null;
}

export interface TheoryPerformanceStats {
  methodId: CandidateMethodId;
  methodName: string;
  shortName: string;
  description: string;
  candidateCount: number;
  evaluatedSpins: number;
  totalHits: number;
  totalMisses: number;
  hitRatePercentage: number;
  theoreticalCoveragePct: number; // e.g. 18/37 * 100 = 48.65% for EU, 18/38 * 100 = 47.37% for US
  coverageDiffPct: number; // hitRatePercentage - theoreticalCoveragePct
  currentStreak: number;
  longestStreak: number;
  latestWinningNumber: string | null;
  latestOutcome: TheoryOutcomeResult;
  latestTimestamp: number;
  latestPreSpinSnapshot: TheorySnapshotRecord | null;
  latestPostSpinSnapshot: TheorySnapshotRecord | null;
  pnlSummary?: PnlSummaryStats;
}
