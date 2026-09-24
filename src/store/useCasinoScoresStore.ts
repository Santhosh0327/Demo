import { create } from 'zustand';
import {
  DiscoveredGame,
  IntegrationMethod,
  ImportPreviewPayload,
  ConnectionState,
  MonitoringState,
  ExtensionStatus,
} from '../types/casinoscores';
import {
  CASINO_SCORES_ROULETTE_CATALOG,
  discoverCasinoScoresGames,
  buildImportPreviewPayload,
  matchGameFromUrl,
} from '../utils/casinoScores';
import {
  pingExtension,
  requestExtensionExtraction,
  registerExtensionBridge,
} from '../utils/casinoScoresExtensionBridge';
import { useRouletteStore } from './useRouletteStore';

const FILTERS_STORAGE_KEY = 'casino_scores_active_filters';

interface CasinoScoresStore {
  discoveredGames: DiscoveredGame[];
  unsupportedGames: { name: string; reason: string }[];
  selectedGameId: string | null;
  providerFilter: string;
  searchQuery: string;
  activeFilters: Record<string, Record<string, string>>;
  isDiscovering: boolean;

  // Connection & Monitoring State
  connectionState: ConnectionState;
  monitoringState: MonitoringState;
  extensionStatus: ExtensionStatus;

  monitoringIntervalId: number | null;
  lastSyncTime: number | null;
  lastConfirmedResult: string | null;
  importedCount: number;
  errorMessage: string | null;
  integrationMethodUsed: IntegrationMethod;
  extensionInstalled: boolean;

  // Modals & Preview State
  previewPayload: ImportPreviewPayload | null;
  isPreviewOpen: boolean;
  isFallbackModalOpen: boolean;

  // Actions
  initializeCasinoScores: () => Promise<void>;
  discoverGames: () => Promise<void>;
  selectGame: (gameId: string) => void;
  connectGameUrl: (urlInput: string) => Promise<void>;
  setProviderFilter: (provider: string) => void;
  setSearchQuery: (query: string) => void;
  applyFilter: (gameId: string, filterId: string, value: string) => void;
  handleLoadHistoryClick: () => Promise<void>;
  processRawExtractedNumbers: (numbers: string[], sourceMethod?: IntegrationMethod) => void;
  confirmImport: (finalNumbers: string[]) => Promise<void>;
  cancelPreview: () => void;
  openFallbackModal: () => void;
  closeFallbackModal: () => void;
  startMonitoring: (intervalMs?: number) => void;
  stopMonitoring: () => void;
  clearError: () => void;
}

function loadSavedFilters(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFilters(filters: Record<string, Record<string, string>>) {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore quota errors
  }
}

// Initial catalog state with 8 verified CasinoScores roulette games
const INITIAL_CATALOG: DiscoveredGame[] = (CASINO_SCORES_ROULETTE_CATALOG as Omit<DiscoveredGame, 'importedResultsCount'>[]).map((g) => ({
  ...g,
  connectionState: 'disconnected' as ConnectionState,
  importedResultsCount: 0,
}));

export const useCasinoScoresStore = create<CasinoScoresStore>((set, get) => ({
  discoveredGames: INITIAL_CATALOG,
  unsupportedGames: [],
  selectedGameId: 'lightning-roulette',
  providerFilter: 'all',
  searchQuery: '',
  activeFilters: loadSavedFilters(),
  isDiscovering: false,

  connectionState: 'disconnected',
  monitoringState: 'idle',
  extensionStatus: 'not_installed',

  monitoringIntervalId: null,
  lastSyncTime: null,
  lastConfirmedResult: null,
  importedCount: 0,
  errorMessage: null,
  integrationMethodUsed: 'browser_extension',
  extensionInstalled: false,

  previewPayload: null,
  isPreviewOpen: false,
  isFallbackModalOpen: false,

  initializeCasinoScores: async () => {
    registerExtensionBridge((numbers) => {
      if (numbers.length > 0) {
        set({
          extensionStatus: 'results_extracted',
          connectionState: 'connected',
        });
        get().processRawExtractedNumbers(numbers, 'browser_extension');
      }
    });

    const isExtInstalled = await pingExtension();
    set({
      extensionInstalled: isExtInstalled,
      extensionStatus: isExtInstalled ? 'connected' : 'not_installed',
      connectionState: isExtInstalled ? 'connected' : 'disconnected',
    });
  },

  discoverGames: async () => {
    set({ isDiscovering: true, errorMessage: null });
    try {
      const { discovered, unsupported } = await discoverCasinoScoresGames();
      const isExt = await pingExtension();

      const currentSelected = get().selectedGameId;
      const initialSelected = currentSelected && discovered.some((g) => g.id === currentSelected)
        ? currentSelected
        : discovered.length > 0
        ? discovered[0].id
        : 'lightning-roulette';

      set({
        discoveredGames: discovered.length > 0 ? discovered : get().discoveredGames,
        unsupportedGames: unsupported,
        selectedGameId: initialSelected,
        isDiscovering: false,
        extensionInstalled: isExt,
        extensionStatus: isExt ? 'connected' : 'not_installed',
        connectionState: isExt ? 'connected' : 'disconnected',
      });
    } catch (err: any) {
      set({
        isDiscovering: false,
        errorMessage: err.message || 'Failed to refresh CasinoScores games catalog.',
      });
    }
  },

  selectGame: (gameId: string) => {
    const game = get().discoveredGames.find((g) => g.id === gameId);
    if (!game) return;

    set({ selectedGameId: gameId, errorMessage: null });

    const mainStore = useRouletteStore.getState();
    if (mainStore.wheelType !== game.wheelType) {
      mainStore.setWheelType(game.wheelType);
    }
  },

  connectGameUrl: async (urlInput: string) => {
    set({ connectionState: 'connecting', errorMessage: null });
    const { discoveredGames } = get();

    const matchResult = matchGameFromUrl(urlInput, discoveredGames);

    if (matchResult.isReviewPage) {
      if (matchResult.game) {
        get().selectGame(matchResult.game.id);
      }
      set({
        connectionState: 'error',
        errorMessage: matchResult.explanation,
        isFallbackModalOpen: true,
      });
      return;
    }

    if (!matchResult.game) {
      set({
        connectionState: 'error',
        errorMessage: `No matching roulette game table found for URL: ${urlInput}`,
        isFallbackModalOpen: true,
      });
      return;
    }

    get().selectGame(matchResult.game.id);

    const isExt = await pingExtension();
    if (isExt) {
      set({
        connectionState: 'connected',
        extensionInstalled: true,
        extensionStatus: 'connected',
        isFallbackModalOpen: false,
        errorMessage: null,
      });
      requestExtensionExtraction();
    } else {
      set({
        connectionState: 'error',
        extensionInstalled: false,
        extensionStatus: 'not_installed',
        errorMessage: 'Chrome Extension bridge not active on this page. Please load public/extension in chrome://extensions or paste spin numbers below.',
        isFallbackModalOpen: true,
      });
    }
  },

  setProviderFilter: (provider: string) => set({ providerFilter: provider }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  applyFilter: (gameId: string, filterId: string, value: string) => {
    const updated = {
      ...get().activeFilters,
      [gameId]: {
        ...(get().activeFilters[gameId] || {}),
        [filterId]: value,
      },
    };
    set({ activeFilters: updated });
    saveFilters(updated);
  },

  handleLoadHistoryClick: async () => {
    const { selectedGameId, discoveredGames, extensionInstalled } = get();
    const game = discoveredGames.find((g) => g.id === selectedGameId);
    if (!game) {
      set({ errorMessage: 'No game selected.' });
      return;
    }

    set({ errorMessage: null });

    if (extensionInstalled) {
      requestExtensionExtraction();
    } else {
      set({ isFallbackModalOpen: true });
    }
  },

  processRawExtractedNumbers: (numbers: string[], sourceMethod: IntegrationMethod = 'browser_extension') => {
    const { selectedGameId, discoveredGames } = get();
    const game = discoveredGames.find((g) => g.id === selectedGameId);
    if (!game) return;

    const mainStore = useRouletteStore.getState();
    const activeSession = mainStore.sessions.find((s) => s.id === mainStore.activeSessionId);
    const targetSessionId = activeSession?.id || 'session_default';
    const targetSessionName = activeSession?.name || 'Main Session';

    const payload = buildImportPreviewPayload(
      game,
      numbers,
      mainStore.spins,
      targetSessionId,
      targetSessionName,
      sourceMethod
    );

    set({
      previewPayload: payload,
      isPreviewOpen: true,
      isFallbackModalOpen: false,
      errorMessage: null,
    });
  },

  confirmImport: async (finalNumbers: string[]) => {
    const { selectedGameId, discoveredGames } = get();
    if (finalNumbers.length === 0) {
      set({ isPreviewOpen: false, previewPayload: null });
      return;
    }

    const mainStore = useRouletteStore.getState();
    await mainStore.importSpinsBatch(finalNumbers, 'copy_paste');

    const lastResult = finalNumbers[finalNumbers.length - 1];

    const updatedGames = discoveredGames.map((g) =>
      g.id === selectedGameId
        ? {
            ...g,
            connectionState: 'connected' as ConnectionState,
            importedResultsCount: g.importedResultsCount + finalNumbers.length,
          }
        : g
    );

    set({
      discoveredGames: updatedGames,
      importedCount: get().importedCount + finalNumbers.length,
      lastConfirmedResult: lastResult,
      lastSyncTime: Date.now(),
      connectionState: 'connected',
      isPreviewOpen: false,
      previewPayload: null,
      errorMessage: null,
    });
  },

  cancelPreview: () => set({ isPreviewOpen: false, previewPayload: null }),

  openFallbackModal: () => set({ isFallbackModalOpen: true }),
  closeFallbackModal: () => set({ isFallbackModalOpen: false }),

  startMonitoring: (intervalMs = 10000) => {
    if (get().monitoringState === 'active') return;

    const { selectedGameId, discoveredGames } = get();
    const game = discoveredGames.find((g) => g.id === selectedGameId);
    if (!game) {
      set({ errorMessage: 'Please select a valid game before starting monitoring.' });
      return;
    }

    set({ monitoringState: 'starting', errorMessage: null });

    const intervalId = window.setInterval(async () => {
      requestExtensionExtraction();
    }, intervalMs);

    set({
      monitoringState: 'active',
      monitoringIntervalId: intervalId,
      errorMessage: null,
    });
  },

  stopMonitoring: () => {
    const { monitoringIntervalId } = get();
    if (monitoringIntervalId !== null) {
      clearInterval(monitoringIntervalId);
    }
    set({
      monitoringState: 'idle',
      monitoringIntervalId: null,
    });
  },

  clearError: () => set({ errorMessage: null }),
}));
