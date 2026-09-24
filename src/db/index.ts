import Dexie, { Table } from 'dexie';
import { CandidatePrediction, RouletteSession, SpinItem } from '../types/roulette';

export class RouletteDatabase extends Dexie {
  sessions!: Table<RouletteSession, string>;
  spins!: Table<SpinItem, string>;
  predictions!: Table<CandidatePrediction, string>;

  constructor() {
    super('RouletteIntelligenceDB');

    this.version(1).stores({
      sessions: 'id, name, wheelType, createdAt, updatedAt',
      spins: 'id, sessionId, number, timestamp, source',
      predictions: 'id, sessionId, timestamp, spinIndex, resolvedSpinId',
    });
  }
}

export const db = new RouletteDatabase();
