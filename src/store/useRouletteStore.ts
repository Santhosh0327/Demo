import { create } from 'zustand';
import { db } from '../db';
import {
  AlgorithmWeights,
  CandidatePrediction,
  CandidateSnapshotRecord,
  CandidateUpdateStatus,
  ConsolidatedEvaluationRecord,
  ConsolidatedPerformanceStats,
  EvaluationTargetFilter,
  PnlConfig,
  PredictionEngineState,
  RouletteSession,
  SpinItem,
  WheelType,
} from '../types/roulette';
import { DEFAULT_WEIGHTS, generateCandidatePrediction } from '../utils/candidateEngine';
import { resolvePrediction } from '../utils/tracking';
import { isValidRouletteNumber } from '../utils/casinoScores';
import {
  computeCandidateSnapshot,
  evaluateSpinAgainstSnapshot,
  recomputeSessionHistory,
} from '../utils/candidateTracker';
import { CandidateMethodId } from '../utils/candidateEngineLab';
import { recomputeTheorySessionHistory } from '../utils/theoryTracker';
import {
  TheoryEvaluationRecord,
  TheoryPerformanceStats,
  TheorySnapshotRecord,
} from '../types/theoryPerformance';
import { DEFAULT_PNL_CONFIG, UNCONFIGURED_PNL_CONFIG, computePnlSummaryStats } from '../utils/pnlCalculator';

interface RouletteStore {
  sessions: RouletteSession[];
  activeSessionId: string | null;
  wheelType: WheelType;
  spins: SpinItem[];
  predictions: CandidatePrediction[];
  currentPrediction: CandidatePrediction | null;
  algorithmWeights: AlgorithmWeights;
  windowSize: number;
  isLoading: boolean;
  sidebarOpen: boolean;
  toast: { text: string; type: 'success' | 'error' | 'info' } | null;
  lastSpinTimestamp: number;

  // Candidate Tracker & Activation Lifecycle State
  isAutoModeActive: boolean;
  engineState: PredictionEngineState;
  candidateUpdateStatus: CandidateUpdateStatus;
  latestSnapshot: CandidateSnapshotRecord | null;
  previousSnapshot: CandidateSnapshotRecord | null;
  evaluations: ConsolidatedEvaluationRecord[];
  performanceStats: ConsolidatedPerformanceStats;
  evaluationTargetFilter: EvaluationTargetFilter;
  pnlConfig: PnlConfig;

  // Theory-Wise Performance State
  theorySnapshots: Record<CandidateMethodId, TheorySnapshotRecord[]>;
  theoryEvaluations: Record<CandidateMethodId, TheoryEvaluationRecord[]>;
  theoryStats: Record<CandidateMethodId, TheoryPerformanceStats>;

  // Actions
  initializeStore: () => Promise<void>;
  createSession: (name: string, wheelType?: WheelType) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setWheelType: (wheelType: WheelType) => Promise<void>;
  activatePredictions: () => Promise<boolean>;
  addSpin: (numberStr: string, source?: SpinItem['source']) => Promise<void>;
  undoLastSpin: () => Promise<void>;
  updateSpin: (spinId: string, newNumber: string) => Promise<void>;
  deleteSpin: (spinId: string) => Promise<void>;
  importSpinsBatch: (numbers: string[], source?: SpinItem['source']) => Promise<void>;
  clearSessionSpins: (resetPnlConfig?: boolean) => Promise<void>;
  updateWeights: (newWeights: Partial<AlgorithmWeights>) => void;
  setWindowSize: (size: number) => void;
  setEvaluationTargetFilter: (filter: EvaluationTargetFilter) => Promise<void>;
  updatePnlConfig: (config: Partial<PnlConfig>) => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

const INITIAL_THEORY_DATA = recomputeTheorySessionHistory('default', [], 'European', false, 0, DEFAULT_PNL_CONFIG);

const DEFAULT_STATS: ConsolidatedPerformanceStats = {
  latestSpinNumber: null,
  latestResult: 'NOT_EVALUATED',
  currentStreak: 0,
  longestStreak: 0,
  totalEvaluatedSpins: 0,
  totalHits: 0,
  totalMisses: 0,
  totalUnverified: 0,
  hitRatePercentage: 0,
  latestEvaluatedVersion: null,
  latestEvaluatedSetSize: 0,
  latestEvaluatedFilter: null,
  pnlSummary: computePnlSummaryStats([], DEFAULT_PNL_CONFIG),
};

export const useRouletteStore = create<RouletteStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  wheelType: 'European',
  spins: [],
  predictions: [],
  currentPrediction: null,
  algorithmWeights: { ...DEFAULT_WEIGHTS },
  windowSize: 50,
  isLoading: true,
  sidebarOpen: true,
  toast: null,
  lastSpinTimestamp: 0,

  // Candidate Tracker & Activation defaults
  isAutoModeActive: false,
  engineState: 'NOT_STARTED',
  candidateUpdateStatus: 'WAITING_FOR_RESULT',
  latestSnapshot: null,
  previousSnapshot: null,
  evaluations: [],
  performanceStats: { ...DEFAULT_STATS },
  evaluationTargetFilter: 'top18',
  pnlConfig: DEFAULT_PNL_CONFIG,

  // Theory Performance State Defaults
  theorySnapshots: INITIAL_THEORY_DATA.theorySnapshots,
  theoryEvaluations: INITIAL_THEORY_DATA.theoryEvaluations,
  theoryStats: INITIAL_THEORY_DATA.theoryStats,

  initializeStore: async () => {
    set({ isLoading: true });
    try {
      let sessions = await db.sessions.toArray();
      if (sessions.length === 0) {
        const defaultSession: RouletteSession = {
          id: 'session_default',
          name: 'Main Session',
          wheelType: 'European',
          isAutoModeActive: false,
          pnlConfig: DEFAULT_PNL_CONFIG,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.sessions.add(defaultSession);
        sessions = [defaultSession];
      }

      const activeSession = sessions[0];
      const activePnlConfig = activeSession.pnlConfig || DEFAULT_PNL_CONFIG;
      const spins = await db.spins.where('sessionId').equals(activeSession.id).sortBy('timestamp');
      const predictions = await db.predictions.where('sessionId').equals(activeSession.id).sortBy('timestamp');

      const isAutoActive = !!activeSession.isAutoModeActive;
      const cutoff = activeSession.activationCutoffIndex ?? 0;

      // Recompute snapshots, evaluations, and streak metrics cleanly
      const recomputed = recomputeSessionHistory(
        activeSession.id,
        spins,
        activeSession.wheelType,
        get().evaluationTargetFilter,
        isAutoActive,
        cutoff,
        activePnlConfig
      );

      const recomputedTheory = recomputeTheorySessionHistory(
        activeSession.id,
        spins,
        activeSession.wheelType,
        isAutoActive,
        cutoff,
        activePnlConfig
      );

      // Persist recomputed snapshots & evaluations to DB
      await db.consolidatedSnapshots.where('sessionId').equals(activeSession.id).delete();
      await db.consolidatedEvaluations.where('sessionId').equals(activeSession.id).delete();
      if (recomputed.snapshots.length > 0) {
        await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
      }
      if (recomputed.evaluations.length > 0) {
        await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
      }

      set({
        sessions,
        activeSessionId: activeSession.id,
        wheelType: activeSession.wheelType,
        spins,
        predictions,
        isAutoModeActive: isAutoActive,
        engineState: isAutoActive ? 'AUTO_MODE_ACTIVE' : 'NOT_STARTED',
        latestSnapshot: recomputed.latestSnapshot,
        previousSnapshot: recomputed.previousSnapshot,
        evaluations: recomputed.evaluations,
        performanceStats: recomputed.performanceStats,
        pnlConfig: activePnlConfig,
        theorySnapshots: recomputedTheory.theorySnapshots,
        theoryEvaluations: recomputedTheory.theoryEvaluations,
        theoryStats: recomputedTheory.theoryStats,
        candidateUpdateStatus: isAutoActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
        isLoading: false,
      });

      const currentPred = generateCandidatePrediction(
        spins,
        activeSession.wheelType,
        get().algorithmWeights,
        get().windowSize
      );
      set({ currentPrediction: currentPred });
    } catch (err) {
      console.error('Failed to initialize database:', err);
      set({ isLoading: false, candidateUpdateStatus: 'UPDATE_FAILED' });
    }
  },

  createSession: async (name: string, wheelType: WheelType = 'European') => {
    const newSession: RouletteSession = {
      id: `session_${Date.now()}`,
      name: name || 'New Session',
      wheelType,
      isAutoModeActive: false,
      pnlConfig: get().pnlConfig,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.sessions.add(newSession);
    const sessions = await db.sessions.toArray();
    set({ sessions });
    await get().selectSession(newSession.id);
    get().showToast(`Created session "${newSession.name}"`, 'success');
    return newSession.id;
  },

  selectSession: async (sessionId: string) => {
    set({ isLoading: true });
    const session = await db.sessions.get(sessionId);
    if (!session) return;

    const spins = await db.spins.where('sessionId').equals(sessionId).sortBy('timestamp');
    const predictions = await db.predictions.where('sessionId').equals(sessionId).sortBy('timestamp');

    const isAutoActive = !!session.isAutoModeActive;
    const cutoff = session.activationCutoffIndex ?? 0;
    const activePnlConfig = session.pnlConfig || get().pnlConfig;

    const recomputed = recomputeSessionHistory(
      sessionId,
      spins,
      session.wheelType,
      get().evaluationTargetFilter,
      isAutoActive,
      cutoff,
      activePnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      sessionId,
      spins,
      session.wheelType,
      isAutoActive,
      cutoff,
      activePnlConfig
    );

    set({
      activeSessionId: sessionId,
      wheelType: session.wheelType,
      spins,
      predictions,
      isAutoModeActive: isAutoActive,
      engineState: isAutoActive ? 'AUTO_MODE_ACTIVE' : 'NOT_STARTED',
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      pnlConfig: activePnlConfig,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
      isLoading: false,
    });

    const currentPred = generateCandidatePrediction(
      spins,
      session.wheelType,
      get().algorithmWeights,
      get().windowSize
    );
    set({ currentPrediction: currentPred });
  },

  renameSession: async (sessionId: string, newName: string) => {
    if (!newName.trim()) return;
    await db.sessions.update(sessionId, { name: newName.trim(), updatedAt: Date.now() });
    const sessions = await db.sessions.toArray();
    set({ sessions });
    get().showToast(`Renamed session to "${newName.trim()}"`, 'success');
  },

  deleteSession: async (sessionId: string) => {
    const { sessions, activeSessionId } = get();
    if (sessions.length <= 1) {
      get().showToast('Cannot delete the only session', 'error');
      return;
    }

    await db.sessions.delete(sessionId);
    await db.spins.where('sessionId').equals(sessionId).delete();
    await db.predictions.where('sessionId').equals(sessionId).delete();
    await db.consolidatedSnapshots.where('sessionId').equals(sessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(sessionId).delete();

    const updatedSessions = await db.sessions.toArray();
    set({ sessions: updatedSessions });

    if (activeSessionId === sessionId) {
      await get().selectSession(updatedSessions[0].id);
    }
    get().showToast('Session deleted', 'info');
  },

  setWheelType: async (wheelType: WheelType) => {
    const { activeSessionId, spins, algorithmWeights, windowSize, evaluationTargetFilter, isAutoModeActive } = get();
    if (!activeSessionId) return;

    await db.sessions.update(activeSessionId, { wheelType, updatedAt: Date.now() });
    const sessions = await db.sessions.toArray();
    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(
      activeSessionId,
      spins,
      wheelType,
      evaluationTargetFilter,
      isAutoModeActive,
      cutoff,
      get().pnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      activeSessionId,
      spins,
      wheelType,
      isAutoModeActive,
      cutoff,
      get().pnlConfig
    );

    await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
    if (recomputed.snapshots.length > 0) {
      await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
    }
    if (recomputed.evaluations.length > 0) {
      await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
    }

    set({
      wheelType,
      sessions,
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoModeActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
    });

    const currentPred = generateCandidatePrediction(spins, wheelType, algorithmWeights, windowSize);
    set({ currentPrediction: currentPred });
    get().showToast(`Wheel set to ${wheelType} Roulette`, 'info');
  },

  activatePredictions: async () => {
    const { activeSessionId, spins, wheelType, evaluationTargetFilter } = get();
    if (!activeSessionId) return false;

    set({ engineState: 'GENERATING' });

    // Validate minimum history requirements
    if (spins.length < 10) {
      set({ engineState: 'INSUFFICIENT_HISTORY' });
      get().showToast(
        `Insufficient history: ${spins.length} logged. Log at least 10 confirmed spins before activating predictions.`,
        'error'
      );
      return false;
    }

    try {
      const activationCutoffIndex = spins.length;
      await db.sessions.update(activeSessionId, {
        isAutoModeActive: true,
        activationCutoffIndex,
        updatedAt: Date.now(),
      });

      const recomputed = recomputeSessionHistory(
        activeSessionId,
        spins,
        wheelType,
        evaluationTargetFilter,
        true,
        activationCutoffIndex,
        get().pnlConfig
      );

      const recomputedTheory = recomputeTheorySessionHistory(
        activeSessionId,
        spins,
        wheelType,
        true,
        activationCutoffIndex,
        get().pnlConfig
      );

      await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
      await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
      if (recomputed.snapshots.length > 0) {
        await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
      }

      set({
        isAutoModeActive: true,
        engineState: 'AUTO_MODE_ACTIVE',
        latestSnapshot: recomputed.latestSnapshot,
        previousSnapshot: recomputed.previousSnapshot,
        evaluations: recomputed.evaluations,
        performanceStats: recomputed.performanceStats,
        theorySnapshots: recomputedTheory.theorySnapshots,
        theoryEvaluations: recomputedTheory.theoryEvaluations,
        theoryStats: recomputedTheory.theoryStats,
        candidateUpdateStatus: 'NEXT_SPIN_READY',
      });

      get().showToast('PREDICTIONS ACTIVATED ✓ — AUTO MODE ON', 'success');
      return true;
    } catch (err) {
      console.error('Failed to activate predictions:', err);
      set({ engineState: 'UPDATE_FAILED' });
      get().showToast('Failed to generate initial candidate snapshot', 'error');
      return false;
    }
  },

  addSpin: async (numberStr: string, source: SpinItem['source'] = 'manual') => {
    const now = Date.now();
    const {
      activeSessionId,
      spins,
      currentPrediction,
      wheelType,
      algorithmWeights,
      windowSize,
      predictions,
      lastSpinTimestamp,
      latestSnapshot,
      performanceStats,
      evaluations,
      evaluationTargetFilter,
      isAutoModeActive,
    } = get();

    if (!activeSessionId) return;

    // Guard: valid pocket string
    if (!isValidRouletteNumber(numberStr, wheelType)) {
      console.warn(`[addSpin] Rejected invalid spin value: "${numberStr}" for ${wheelType} roulette`);
      get().showToast(`Invalid spin value "${numberStr}" — must be 0-36${wheelType === 'American' ? ' or 00' : ''}`, 'error');
      if (isAutoModeActive) set({ candidateUpdateStatus: 'UPDATE_FAILED' });
      return;
    }

    // Double-click guard
    if (source === 'manual' && now - lastSpinTimestamp < 150) {
      return;
    }

    set({ lastSpinTimestamp: now });

    const spinId = `spin_${now}_idx${spins.length + 1}`;
    const newSpin: SpinItem = {
      id: spinId,
      sessionId: activeSessionId,
      number: numberStr,
      timestamp: now,
      source,
    };

    // If Predictions are NOT active yet: enter into history without evaluating or calculating predictions
    if (!isAutoModeActive) {
      await db.spins.add(newSpin);
      const updatedSpins = [...spins, newSpin];
      set({ spins: updatedSpins });
      return;
    }

    // Auto Mode IS active: Execute pre-spin evaluation & fresh snapshot generation
    set({ candidateUpdateStatus: 'RESULT_CONFIRMED' });

    // 1. Retrieve latest valid pre-spin candidate snapshot & evaluate
    const preSpinSnapshot = latestSnapshot;
    const evalRecord = evaluateSpinAgainstSnapshot(
      newSpin,
      spins.length + 1,
      preSpinSnapshot,
      performanceStats.currentStreak,
      performanceStats.longestStreak,
      performanceStats.pnlSummary?.cumulativePnl ?? 0
    );

    await db.consolidatedEvaluations.add(evalRecord);
    const updatedEvaluations = [...evaluations, evalRecord];

    let updatedPredictions = [...predictions];
    if (currentPrediction) {
      const resolved = resolvePrediction(currentPrediction, numberStr, spinId);
      await db.predictions.add(resolved);
      updatedPredictions.push(resolved);
      newSpin.snapshotId = resolved.id;
    }

    // Append spin to history
    await db.spins.add(newSpin);
    const updatedSpins = [...spins, newSpin];

    // 2. Set status CALCULATING & compute next candidate snapshot
    set({ candidateUpdateStatus: 'CALCULATING' });

    try {
      const session = await db.sessions.get(activeSessionId);
      const cutoff = session?.activationCutoffIndex ?? 0;
      const recomputedTheory = recomputeTheorySessionHistory(
        activeSessionId,
        updatedSpins,
        wheelType,
        true,
        cutoff,
        get().pnlConfig
      );

      const nextSnapshot = computeCandidateSnapshot(
        activeSessionId,
        updatedSpins,
        wheelType,
        evaluationTargetFilter,
        preSpinSnapshot,
        get().pnlConfig
      );

      await db.consolidatedSnapshots.add(nextSnapshot);

      const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

      const evaluatedRecords = updatedEvaluations.filter((e) => e.result === 'HIT' || e.result === 'MISS');
      const totalHits = evaluatedRecords.filter((e) => e.result === 'HIT').length;
      const totalMisses = evaluatedRecords.filter((e) => e.result === 'MISS').length;
      const totalUnverified = updatedEvaluations.filter((e) => e.result === 'UNVERIFIED').length;
      const totalEvaluatedSpins = evaluatedRecords.length;
      const hitRatePercentage = totalEvaluatedSpins > 0 ? (totalHits / totalEvaluatedSpins) * 100 : 0;

      const pnlRecords = updatedEvaluations.map((e) => e.pnlRecord).filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);

      const newStats: ConsolidatedPerformanceStats = {
        latestSpinNumber: numberStr,
        latestResult: evalRecord.result,
        currentStreak: evalRecord.currentStreak,
        longestStreak: evalRecord.longestStreak,
        totalEvaluatedSpins,
        totalHits,
        totalMisses,
        totalUnverified,
        hitRatePercentage,
        latestEvaluatedVersion: evalRecord.snapshotVersion,
        latestEvaluatedSetSize: evalRecord.evaluatedSetSize,
        latestEvaluatedFilter: evalRecord.evaluatedFilter,
        pnlSummary: computePnlSummaryStats(pnlRecords, get().pnlConfig),
      };

      set({
        spins: updatedSpins,
        predictions: updatedPredictions,
        currentPrediction: nextPrediction,
        latestSnapshot: nextSnapshot,
        previousSnapshot: preSpinSnapshot,
        evaluations: updatedEvaluations,
        performanceStats: newStats,
        theorySnapshots: recomputedTheory.theorySnapshots,
        theoryEvaluations: recomputedTheory.theoryEvaluations,
        theoryStats: recomputedTheory.theoryStats,
        candidateUpdateStatus: 'NEXT_SPIN_READY',
      });
    } catch (err) {
      console.error('[addSpin] Failed to compute candidate snapshot:', err);
      set({ candidateUpdateStatus: 'UPDATE_FAILED' });
    }
  },

  undoLastSpin: async () => {
    const { activeSessionId, spins, wheelType, evaluationTargetFilter, algorithmWeights, windowSize, isAutoModeActive, pnlConfig } = get();
    if (!activeSessionId || spins.length === 0) return;

    const lastSpin = spins[spins.length - 1];
    await db.spins.delete(lastSpin.id);
    const updatedSpins = spins.slice(0, -1);

    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      evaluationTargetFilter,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
    if (recomputed.snapshots.length > 0) {
      await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
    }
    if (recomputed.evaluations.length > 0) {
      await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
    }

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoModeActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
    });

    get().showToast(`Undid spin ${lastSpin.number}`, 'info');
  },

  updateSpin: async (spinId: string, newNumber: string) => {
    const { activeSessionId, spins, wheelType, evaluationTargetFilter, algorithmWeights, windowSize, isAutoModeActive, pnlConfig } = get();
    if (!activeSessionId) return;

    const index = spins.findIndex((s) => s.id === spinId);
    if (index === -1) return;

    await db.spins.update(spinId, { number: newNumber });
    const updatedSpins = [...spins];
    updatedSpins[index] = { ...updatedSpins[index], number: newNumber };

    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      evaluationTargetFilter,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
    if (recomputed.snapshots.length > 0) {
      await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
    }
    if (recomputed.evaluations.length > 0) {
      await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
    }

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoModeActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
    });

    get().showToast(`Spin corrected to ${newNumber}`, 'success');
  },

  deleteSpin: async (spinId: string) => {
    const { activeSessionId, spins, wheelType, evaluationTargetFilter, algorithmWeights, windowSize, isAutoModeActive, pnlConfig } = get();
    if (!activeSessionId) return;

    await db.spins.delete(spinId);
    const updatedSpins = spins.filter((s) => s.id !== spinId);

    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      evaluationTargetFilter,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
    if (recomputed.snapshots.length > 0) {
      await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
    }
    if (recomputed.evaluations.length > 0) {
      await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
    }

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoModeActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
    });

    get().showToast('Spin deleted', 'info');
  },

  importSpinsBatch: async (numbers: string[], source: SpinItem['source'] = 'copy_paste') => {
    const { activeSessionId, spins, wheelType, evaluationTargetFilter, algorithmWeights, windowSize, isAutoModeActive, pnlConfig } = get();
    if (!activeSessionId || numbers.length === 0) return;

    const validNumbers = numbers.filter((numStr) => isValidRouletteNumber(numStr.trim(), wheelType));

    if (validNumbers.length === 0) {
      get().showToast('No valid roulette numbers found in batch import', 'error');
      return;
    }

    if (validNumbers.length < numbers.length) {
      const rejectedCount = numbers.length - validNumbers.length;
      get().showToast(`Skipped ${rejectedCount} invalid value(s)`, 'error');
    }

    const baseTime = Date.now() - validNumbers.length * 1000;
    const newSpins: SpinItem[] = validNumbers.map((numStr, index) => ({
      id: `spin_${baseTime + index}_idx${spins.length + index + 1}`,
      sessionId: activeSessionId,
      number: numStr.trim(),
      timestamp: baseTime + index * 1000,
      source,
    }));

    await db.spins.bulkAdd(newSpins);
    const updatedSpins = [...spins, ...newSpins];

    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      evaluationTargetFilter,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    const recomputedTheory = recomputeTheorySessionHistory(
      activeSessionId,
      updatedSpins,
      wheelType,
      isAutoModeActive,
      cutoff,
      pnlConfig
    );

    await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
    await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
    if (recomputed.snapshots.length > 0) {
      await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
    }
    if (recomputed.evaluations.length > 0) {
      await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
    }

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      evaluations: recomputed.evaluations,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
      candidateUpdateStatus: isAutoModeActive ? 'NEXT_SPIN_READY' : 'WAITING_FOR_RESULT',
    });

    get().showToast(`Imported ${newSpins.length} spins`, 'success');
  },

  clearSessionSpins: async (resetPnlConfig: boolean = false) => {
    const { activeSessionId, wheelType, algorithmWeights, windowSize, pnlConfig } = get();
    if (!activeSessionId) return;

    const targetPnlConfig = resetPnlConfig ? UNCONFIGURED_PNL_CONFIG : pnlConfig;

    try {
      await db.sessions.update(activeSessionId, {
        isAutoModeActive: false,
        activationCutoffIndex: 0,
        pnlConfig: targetPnlConfig,
        updatedAt: Date.now(),
      });
      await db.spins.where('sessionId').equals(activeSessionId).delete();
      await db.predictions.where('sessionId').equals(activeSessionId).delete();
      await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
      await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
      await db.theorySnapshots.where('sessionId').equals(activeSessionId).delete();
      await db.theoryEvaluations.where('sessionId').equals(activeSessionId).delete();

      const updatedSessions = await db.sessions.toArray();
      const nextPrediction = generateCandidatePrediction([], wheelType, algorithmWeights, windowSize);
      const clearedTheory = recomputeTheorySessionHistory(activeSessionId, [], wheelType, false, 0, targetPnlConfig);

      set({
        sessions: updatedSessions,
        spins: [],
        predictions: [],
        currentPrediction: nextPrediction,
        isAutoModeActive: false,
        engineState: 'NOT_STARTED',
        latestSnapshot: null,
        previousSnapshot: null,
        evaluations: [],
        performanceStats: {
          ...DEFAULT_STATS,
          pnlSummary: computePnlSummaryStats([], targetPnlConfig),
        },
        pnlConfig: targetPnlConfig,
        theorySnapshots: clearedTheory.theorySnapshots,
        theoryEvaluations: clearedTheory.theoryEvaluations,
        theoryStats: clearedTheory.theoryStats,
        candidateUpdateStatus: 'WAITING_FOR_RESULT',
      });

      get().showToast(
        resetPnlConfig
          ? 'Cleared session spins & reset P&L configuration'
          : 'Cleared session spins (P&L configuration retained)',
        'info'
      );
    } catch (err) {
      console.error('Failed to clear session:', err);
      get().showToast('Failed to clear session data', 'error');
    }
  },

  updateWeights: (newWeights: Partial<AlgorithmWeights>) => {
    const updatedWeights = { ...get().algorithmWeights, ...newWeights };
    set({ algorithmWeights: updatedWeights });

    const { spins, wheelType, windowSize } = get();
    const nextPrediction = generateCandidatePrediction(spins, wheelType, updatedWeights, windowSize);
    set({ currentPrediction: nextPrediction });
  },

  setWindowSize: (size: number) => {
    set({ windowSize: size });
    const { spins, wheelType, algorithmWeights } = get();
    const nextPrediction = generateCandidatePrediction(spins, wheelType, algorithmWeights, size);
    set({ currentPrediction: nextPrediction });
  },

  setEvaluationTargetFilter: async (filter: EvaluationTargetFilter) => {
    set({ evaluationTargetFilter: filter });
    const { activeSessionId, spins, wheelType, isAutoModeActive, pnlConfig } = get();
    if (!activeSessionId) return;

    const session = await db.sessions.get(activeSessionId);
    const cutoff = session?.activationCutoffIndex ?? 0;

    const recomputed = recomputeSessionHistory(activeSessionId, spins, wheelType, filter, isAutoModeActive, cutoff, pnlConfig);
    const recomputedTheory = recomputeTheorySessionHistory(activeSessionId, spins, wheelType, isAutoModeActive, cutoff, pnlConfig);

    set({
      latestSnapshot: recomputed.latestSnapshot,
      previousSnapshot: recomputed.previousSnapshot,
      performanceStats: recomputed.performanceStats,
      theorySnapshots: recomputedTheory.theorySnapshots,
      theoryEvaluations: recomputedTheory.theoryEvaluations,
      theoryStats: recomputedTheory.theoryStats,
    });
  },

  updatePnlConfig: async (newConfig: Partial<PnlConfig>) => {
    const { activeSessionId, pnlConfig, spins, wheelType, evaluationTargetFilter, isAutoModeActive } = get();
    const updatedPnlConfig: PnlConfig = {
      ...pnlConfig,
      ...newConfig,
    };

    set({ pnlConfig: updatedPnlConfig });

    if (activeSessionId) {
      await db.sessions.update(activeSessionId, { pnlConfig: updatedPnlConfig, updatedAt: Date.now() });

      const session = await db.sessions.get(activeSessionId);
      const cutoff = session?.activationCutoffIndex ?? 0;

      const recomputed = recomputeSessionHistory(
        activeSessionId,
        spins,
        wheelType,
        evaluationTargetFilter,
        isAutoModeActive,
        cutoff,
        updatedPnlConfig
      );

      const recomputedTheory = recomputeTheorySessionHistory(
        activeSessionId,
        spins,
        wheelType,
        isAutoModeActive,
        cutoff,
        updatedPnlConfig
      );

      await db.consolidatedSnapshots.where('sessionId').equals(activeSessionId).delete();
      await db.consolidatedEvaluations.where('sessionId').equals(activeSessionId).delete();
      if (recomputed.snapshots.length > 0) {
        await db.consolidatedSnapshots.bulkAdd(recomputed.snapshots);
      }
      if (recomputed.evaluations.length > 0) {
        await db.consolidatedEvaluations.bulkAdd(recomputed.evaluations);
      }

      set({
        latestSnapshot: recomputed.latestSnapshot,
        previousSnapshot: recomputed.previousSnapshot,
        evaluations: recomputed.evaluations,
        performanceStats: recomputed.performanceStats,
        theorySnapshots: recomputedTheory.theorySnapshots,
        theoryEvaluations: recomputedTheory.theoryEvaluations,
        theoryStats: recomputedTheory.theoryStats,
      });
    }

    get().showToast('P&L Configuration updated', 'info');
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  showToast: (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ toast: { text, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },

  clearToast: () => set({ toast: null }),
}));
