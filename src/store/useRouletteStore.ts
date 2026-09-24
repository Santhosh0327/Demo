import { create } from 'zustand';
import { db } from '../db';
import {
  AlgorithmWeights,
  CandidatePrediction,
  RouletteSession,
  SpinItem,
  WheelType,
} from '../types/roulette';
import { DEFAULT_WEIGHTS, generateCandidatePrediction } from '../utils/candidateEngine';
import { resolvePrediction } from '../utils/tracking';

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

  // Actions
  initializeStore: () => Promise<void>;
  createSession: (name: string, wheelType?: WheelType) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setWheelType: (wheelType: WheelType) => Promise<void>;
  addSpin: (numberStr: string, source?: SpinItem['source']) => Promise<void>;
  undoLastSpin: () => Promise<void>;
  updateSpin: (spinId: string, newNumber: string) => Promise<void>;
  deleteSpin: (spinId: string) => Promise<void>;
  importSpinsBatch: (numbers: string[], source?: SpinItem['source']) => Promise<void>;
  clearSessionSpins: () => Promise<void>;
  updateWeights: (newWeights: Partial<AlgorithmWeights>) => void;
  setWindowSize: (size: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

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

  initializeStore: async () => {
    set({ isLoading: true });
    try {
      let sessions = await db.sessions.toArray();
      if (sessions.length === 0) {
        const defaultSession: RouletteSession = {
          id: 'session_default',
          name: 'Main Session',
          wheelType: 'European',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.sessions.add(defaultSession);
        sessions = [defaultSession];
      }

      const activeSession = sessions[0];
      const spins = await db.spins.where('sessionId').equals(activeSession.id).sortBy('timestamp');
      const predictions = await db.predictions.where('sessionId').equals(activeSession.id).sortBy('timestamp');

      set({
        sessions,
        activeSessionId: activeSession.id,
        wheelType: activeSession.wheelType,
        spins,
        predictions,
        isLoading: false,
      });

      // Generate initial pre-spin candidate prediction ONLY if history is sufficient
      const currentPred = generateCandidatePrediction(
        spins,
        activeSession.wheelType,
        get().algorithmWeights,
        get().windowSize
      );
      set({ currentPrediction: currentPred });
    } catch (err) {
      console.error('Failed to initialize database:', err);
      set({ isLoading: false });
    }
  },

  createSession: async (name: string, wheelType: WheelType = 'European') => {
    const newSession: RouletteSession = {
      id: `session_${Date.now()}`,
      name: name || 'New Session',
      wheelType,
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

    set({
      activeSessionId: sessionId,
      wheelType: session.wheelType,
      spins,
      predictions,
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

    const updatedSessions = await db.sessions.toArray();
    set({ sessions: updatedSessions });

    if (activeSessionId === sessionId) {
      await get().selectSession(updatedSessions[0].id);
    }
    get().showToast('Session deleted', 'info');
  },

  setWheelType: async (wheelType: WheelType) => {
    const { activeSessionId, spins, algorithmWeights, windowSize } = get();
    if (!activeSessionId) return;

    await db.sessions.update(activeSessionId, { wheelType, updatedAt: Date.now() });
    const sessions = await db.sessions.toArray();
    set({ wheelType, sessions });

    const currentPred = generateCandidatePrediction(spins, wheelType, algorithmWeights, windowSize);
    set({ currentPrediction: currentPred });
    get().showToast(`Wheel set to ${wheelType} Roulette`, 'info');
  },

  addSpin: async (numberStr: string, source: SpinItem['source'] = 'manual') => {
    const now = Date.now();
    const { activeSessionId, spins, currentPrediction, wheelType, algorithmWeights, windowSize, predictions, lastSpinTimestamp } = get();
    if (!activeSessionId) return;

    // Double click guard: if manual entry occurs within 150ms of previous tap, prevent accidental duplicate click
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

    let updatedPredictions = [...predictions];

    // If we had a valid pre-spin prediction snapshot, resolve it against this new actual result!
    if (currentPrediction) {
      const resolved = resolvePrediction(currentPrediction, numberStr, spinId);
      await db.predictions.add(resolved);
      updatedPredictions.push(resolved);
      newSpin.snapshotId = resolved.id;
    }

    await db.spins.add(newSpin);
    const updatedSpins = [...spins, newSpin];

    // Generate new prediction snapshot for the upcoming spin
    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      predictions: updatedPredictions,
      currentPrediction: nextPrediction,
    });
  },

  undoLastSpin: async () => {
    const { spins, predictions, wheelType, algorithmWeights, windowSize } = get();
    if (spins.length === 0) return;

    const lastSpin = spins[spins.length - 1];
    await db.spins.delete(lastSpin.id);

    const updatedSpins = spins.slice(0, -1);

    // If there was a prediction associated with this spin, remove it
    let updatedPredictions = [...predictions];
    if (lastSpin.snapshotId) {
      await db.predictions.delete(lastSpin.snapshotId);
      updatedPredictions = updatedPredictions.filter((p) => p.id !== lastSpin.snapshotId);
    }

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      predictions: updatedPredictions,
      currentPrediction: nextPrediction,
    });

    get().showToast(`Undid spin ${lastSpin.number}`, 'info');
  },

  updateSpin: async (spinId: string, newNumber: string) => {
    const { spins, wheelType, algorithmWeights, windowSize } = get();
    const index = spins.findIndex((s) => s.id === spinId);
    if (index === -1) return;

    await db.spins.update(spinId, { number: newNumber });
    const updatedSpins = [...spins];
    updatedSpins[index] = { ...updatedSpins[index], number: newNumber };

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
    });

    get().showToast(`Spin corrected to ${newNumber}`, 'success');
  },

  deleteSpin: async (spinId: string) => {
    const { spins, wheelType, algorithmWeights, windowSize } = get();
    await db.spins.delete(spinId);
    const updatedSpins = spins.filter((s) => s.id !== spinId);

    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
    });

    get().showToast('Spin deleted', 'info');
  },

  importSpinsBatch: async (numbers: string[], source: SpinItem['source'] = 'copy_paste') => {
    const { activeSessionId, spins, wheelType, algorithmWeights, windowSize } = get();
    if (!activeSessionId || numbers.length === 0) return;

    const baseTime = Date.now() - numbers.length * 1000;
    const newSpins: SpinItem[] = numbers.map((numStr, index) => ({
      id: `spin_${baseTime + index}_idx${spins.length + index + 1}`,
      sessionId: activeSessionId,
      number: numStr,
      timestamp: baseTime + index * 1000,
      source,
    }));

    await db.spins.bulkAdd(newSpins);
    const updatedSpins = [...spins, ...newSpins];

    // Batch imports update available history and generate a pre-spin snapshot for upcoming spin N+1
    const nextPrediction = generateCandidatePrediction(updatedSpins, wheelType, algorithmWeights, windowSize);

    set({
      spins: updatedSpins,
      currentPrediction: nextPrediction,
    });

    get().showToast(`Imported ${numbers.length} spins successfully`, 'success');
  },

  clearSessionSpins: async () => {
    const { activeSessionId, wheelType, algorithmWeights, windowSize } = get();
    if (!activeSessionId) return;

    await db.spins.where('sessionId').equals(activeSessionId).delete();
    await db.predictions.where('sessionId').equals(activeSessionId).delete();

    const nextPrediction = generateCandidatePrediction([], wheelType, algorithmWeights, windowSize);

    set({
      spins: [],
      predictions: [],
      currentPrediction: nextPrediction,
    });

    get().showToast('Cleared session spins', 'info');
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
