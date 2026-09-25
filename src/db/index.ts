import Dexie, { Table } from 'dexie';
import {
  CandidatePrediction,
  CandidateSnapshotRecord,
  ConsolidatedEvaluationRecord,
  RouletteSession,
  SpinItem,
} from '../types/roulette';
import { TheoryEvaluationRecord, TheorySnapshotRecord } from '../types/theoryPerformance';

export class RouletteDatabase extends Dexie {
  sessions!: Table<RouletteSession, string>;
  spins!: Table<SpinItem, string>;
  predictions!: Table<CandidatePrediction, string>;
  consolidatedSnapshots!: Table<CandidateSnapshotRecord, string>;
  consolidatedEvaluations!: Table<ConsolidatedEvaluationRecord, string>;
  theorySnapshots!: Table<TheorySnapshotRecord, string>;
  theoryEvaluations!: Table<TheoryEvaluationRecord, string>;

  constructor() {
    super('RouletteIntelligenceDB');

    this.version(1).stores({
      sessions: 'id, name, wheelType, createdAt, updatedAt',
      spins: 'id, sessionId, number, timestamp, source',
      predictions: 'id, sessionId, timestamp, spinIndex, resolvedSpinId',
    });

    this.version(2).stores({
      sessions: 'id, name, wheelType, createdAt, updatedAt',
      spins: 'id, sessionId, number, timestamp, source',
      predictions: 'id, sessionId, timestamp, spinIndex, resolvedSpinId',
      consolidatedSnapshots: 'id, sessionId, version, spinCutoffIndex, timestamp',
      consolidatedEvaluations: 'id, sessionId, spinId, snapshotId, timestamp',
    });

    this.version(3).stores({
      sessions: 'id, name, wheelType, isAutoModeActive, createdAt, updatedAt',
      spins: 'id, sessionId, number, timestamp, source',
      predictions: 'id, sessionId, timestamp, spinIndex, resolvedSpinId',
      consolidatedSnapshots: 'id, sessionId, version, spinCutoffIndex, timestamp',
      consolidatedEvaluations: 'id, sessionId, spinId, snapshotId, timestamp',
    });

    this.version(4).stores({
      sessions: 'id, name, wheelType, isAutoModeActive, createdAt, updatedAt',
      spins: 'id, sessionId, number, timestamp, source',
      predictions: 'id, sessionId, timestamp, spinIndex, resolvedSpinId',
      consolidatedSnapshots: 'id, sessionId, version, spinCutoffIndex, timestamp',
      consolidatedEvaluations: 'id, sessionId, spinId, snapshotId, timestamp',
      theorySnapshots: 'id, sessionId, methodId, version, spinCutoffIndex, timestamp',
      theoryEvaluations: 'id, sessionId, methodId, spinId, snapshotId, timestamp',
    });
  }
}


export const db = new RouletteDatabase();

