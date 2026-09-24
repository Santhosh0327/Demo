export type IntegrationMethod =
  | 'authorized_api'
  | 'public_page_extraction'
  | 'browser_extension'
  | 'screen_capture'
  | 'manual_fallback';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type MonitoringState = 'idle' | 'starting' | 'active' | 'stopping' | 'error';

export type ExtensionStatus =
  | 'not_installed'
  | 'permission_missing'
  | 'connected'
  | 'unsupported_page'
  | 'extraction_unavailable'
  | 'results_extracted';

export interface FilterOption {
  label: string;
  value: string;
}

export interface GameFilter {
  id: string;
  name: string;
  type: 'time_range' | 'date_range' | 'pagination' | 'variant' | 'provider';
  options: FilterOption[];
  defaultValue: string;
  isVerified: boolean;
}

export interface DiscoveredGame {
  id: string;
  sourceWebsite: string;
  name: string;
  url: string;
  provider?: string;
  wheelType: 'European' | 'American';
  supportedFilters: GameFilter[];
  extractionMethod: IntegrationMethod;
  lastSyncTimestamp?: number;
  connectionState: ConnectionState;
  resultsAccessible: boolean;
  errorMessage?: string;
  importedResultsCount: number;
}

export interface CasinoScoresResult {
  id: string;
  sourceGameId: string;
  sourceUrl: string;
  winningNumber: string;
  rouletteVariant: 'European' | 'American';
  roundId?: string;
  sourceTimestamp?: number;
  importTimestamp: number;
  chronologicalPosition: number;
  extractionMethod: IntegrationMethod;
  verificationStatus: 'verified' | 'unverified' | 'pending_confirmation';
}

export interface ImportPreviewPayload {
  gameId: string;
  gameName: string;
  wheelType: 'European' | 'American';
  rawNumbersFound: string[];
  validatedNumbers: string[];
  chronologicalOrder: 'newest_first' | 'oldest_first';
  duplicateCount: number;
  newUniqueNumbers: string[];
  targetSessionId: string;
  targetSessionName: string;
  extractionMethod: IntegrationMethod;
}

export interface UrlMatchResult {
  game: DiscoveredGame | null;
  isReviewPage: boolean;
  actualResultUrl?: string;
  explanation?: string;
}
