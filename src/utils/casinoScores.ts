import {
  DiscoveredGame,
  GameFilter,
  CasinoScoresResult,
  IntegrationMethod,
  ConnectionState,
  ImportPreviewPayload,
  UrlMatchResult,
} from '../types/casinoscores';
import { SpinItem, WheelType } from '../types/roulette';

// List of non-roulette keywords to strictly exclude
const NON_ROULETTE_KEYWORDS = [
  'crazy time',
  'monopoly',
  'sweet bonanza',
  'baccarat',
  'blackjack',
  'poker',
  'dice',
  'slots',
  'stock market',
  'coin flip',
  'fan tan',
  'crash',
  'ice fishing',
  'funky time',
  'dream catcher',
  'mega ball',
  'football studio',
  'dragon tiger',
  'sic bo',
  'bac bo',
];

// Catalog of accessible roulette games on CasinoScores
export const CASINO_SCORES_ROULETTE_CATALOG: Omit<DiscoveredGame, 'importedResultsCount'>[] = [
  {
    id: 'lightning-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Lightning Roulette',
    url: 'https://www.casino.org/casinoscores/lightning-roulette/',
    provider: 'Evolution',
    wheelType: 'European',
    supportedFilters: [
      {
        id: 'time_range',
        name: 'Time Range',
        type: 'time_range',
        options: [
          { label: 'Last 1 Hour', value: '1h' },
          { label: 'Last 6 Hours', value: '6h' },
          { label: 'Last 24 Hours', value: '24h' },
        ],
        defaultValue: '24h',
        isVerified: true,
      },
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [
          { label: '25 Spins', value: '25' },
          { label: '50 Spins', value: '50' },
          { label: '100 Spins', value: '100' },
        ],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'xxxtreme-lightning-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'XXXtreme Lightning Roulette',
    url: 'https://www.casino.org/casinoscores/xxxtreme-lightning-roulette/',
    provider: 'Evolution',
    wheelType: 'European',
    supportedFilters: [
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [
          { label: '25 Spins', value: '25' },
          { label: '50 Spins', value: '50' },
          { label: '100 Spins', value: '100' },
        ],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'immersive-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Immersive Roulette',
    url: 'https://www.casino.org/casinoscores/immersive-roulette/',
    provider: 'Evolution',
    wheelType: 'European',
    supportedFilters: [
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [
          { label: '25 Spins', value: '25' },
          { label: '50 Spins', value: '50' },
        ],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'mega-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Mega Roulette',
    url: 'https://www.casino.org/casinoscores/mega-roulette/',
    provider: 'Pragmatic Play',
    wheelType: 'European',
    supportedFilters: [
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [
          { label: '25 Spins', value: '25' },
          { label: '50 Spins', value: '50' },
        ],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'auto-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Auto Roulette',
    url: 'https://www.casino.org/casinoscores/auto-roulette/',
    provider: 'Evolution',
    wheelType: 'European',
    supportedFilters: [
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [{ label: '50 Spins', value: '50' }],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'american-roulette-live',
    sourceWebsite: 'https://casinoscores.com',
    name: 'American Roulette Live',
    url: 'https://www.casino.org/casinoscores/american-roulette/',
    provider: 'Evolution',
    wheelType: 'American',
    supportedFilters: [
      {
        id: 'spin_limit',
        name: 'Spin History Limit',
        type: 'pagination',
        options: [
          { label: '25 Spins', value: '25' },
          { label: '50 Spins', value: '50' },
        ],
        defaultValue: '50',
        isVerified: true,
      },
    ],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'red-door-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Red Door Roulette',
    url: 'https://www.casino.org/casinoscores/red-door-roulette/',
    provider: 'Evolution',
    wheelType: 'European',
    supportedFilters: [],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
  {
    id: 'fireball-roulette',
    sourceWebsite: 'https://casinoscores.com',
    name: 'Fireball Roulette',
    url: 'https://www.casino.org/casinoscores/fireball-roulette/',
    provider: 'Authentic Gaming',
    wheelType: 'European',
    supportedFilters: [],
    extractionMethod: 'browser_extension',
    connectionState: 'disconnected',
    resultsAccessible: true,
  },
];

/**
 * Detect whether input text is a URL
 */
export function isUrl(text: string): boolean {
  if (!text) return false;
  const clean = text.trim().toLowerCase();
  return (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('www.') ||
    clean.includes('casino.org/') ||
    clean.includes('casinoscores.com/') ||
    clean.includes('casinoorg-india.com/')
  );
}

/**
 * Match URL to corresponding game in catalog and distinguish review pages from result pages
 */
export function matchGameFromUrl(
  urlInput: string,
  catalog: DiscoveredGame[] = CASINO_SCORES_ROULETTE_CATALOG as DiscoveredGame[]
): UrlMatchResult {
  if (!urlInput) return { game: null, isReviewPage: false };
  const cleanInput = urlInput.trim().toLowerCase();

  const isReviewPage = cleanInput.includes('casinoorg-india.com') || cleanInput.includes('/india/');

  let matchedGame: DiscoveredGame | null = null;
  for (const game of catalog) {
    const gameUrlClean = game.url.toLowerCase();
    const gameIdClean = game.id.toLowerCase();

    if (cleanInput === gameUrlClean || cleanInput.includes(gameIdClean)) {
      matchedGame = game;
      break;
    }
  }

  if (!matchedGame) {
    for (const game of catalog) {
      const segment = game.id.replace(/-live$/, '');
      if (cleanInput.includes(segment)) {
        matchedGame = game;
        break;
      }
    }
  }

  if (isReviewPage) {
    return {
      game: matchedGame,
      isReviewPage: true,
      actualResultUrl: matchedGame ? matchedGame.url : 'https://www.casino.org/casinoscores/lightning-roulette/',
      explanation: matchedGame
        ? `This URL is an informational review page on casinoorg-india.com. Live roulette results for ${matchedGame.name} are published on the official result page at ${matchedGame.url}.`
        : 'This URL is a review/reference page. Please use an official CasinoScores game URL.',
    };
  }

  return {
    game: matchedGame,
    isReviewPage: false,
    actualResultUrl: matchedGame?.url,
  };
}

/**
 * Filter out non-roulette game titles
 */
export function isRouletteGame(gameName: string): boolean {
  const lowerName = gameName.toLowerCase();
  for (const keyword of NON_ROULETTE_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      return false;
    }
  }
  return lowerName.includes('roulette');
}

/**
 * Validate whether a string is a valid roulette winning number for the given wheel variant
 */
export function isValidRouletteNumber(numStr: string, wheelType: 'European' | 'American'): boolean {
  if (!numStr) return false;
  const clean = numStr.trim();
  if (clean === '0') return true;
  if (clean === '00') return wheelType === 'American';

  const num = parseInt(clean, 10);
  if (isNaN(num)) return false;
  return num >= 1 && num <= 36;
}

/**
 * Extract genuine numbers from raw text or JSON payloads
 * Guard against parsing numbers from URLs!
 */
export function parseCasinoScoresNumbers(
  rawText: string,
  wheelType: 'European' | 'American' = 'European'
): { numbers: string[]; isUrlDetected: boolean } {
  if (!rawText) return { numbers: [], isUrlDetected: false };

  if (isUrl(rawText)) {
    return { numbers: [], isUrlDetected: true };
  }

  const extracted: string[] = [];

  // Match JSON objects if available in hydration data
  const jsonMatches = rawText.matchAll(/"(?:winningNumber|result|winning_number)"\s*:\s*"(00|0|[1-9]|[12][0-9]|3[0-6])"/g);
  for (const match of jsonMatches) {
    if (match[1] && isValidRouletteNumber(match[1], wheelType)) {
      extracted.push(match[1]);
    }
  }

  if (extracted.length > 0) return { numbers: extracted, isUrlDetected: false };

  // Match DOM elements or data-number patterns
  const domMatches = rawText.matchAll(/(?:data-number|spin-result|winning-pocket)=["'](00|0|[1-9]|[12][0-9]|3[0-6])["']/gi);
  for (const match of domMatches) {
    if (match[1] && isValidRouletteNumber(match[1], wheelType)) {
      extracted.push(match[1]);
    }
  }

  if (extracted.length > 0) return { numbers: extracted, isUrlDetected: false };

  // Plain text token extraction with multiplier guard
  const tokens = rawText.split(/[\s,;|<>]+/);
  for (const token of tokens) {
    const clean = token.replace(/[^0-9]/g, '');
    if (token.toLowerCase().includes('x') || clean.length > 2) continue; // Skip 500x multipliers or long round IDs
    if (isValidRouletteNumber(clean, wheelType)) {
      extracted.push(clean);
    }
  }

  return { numbers: extracted, isUrlDetected: false };
}

/**
 * Filter duplicate spin events while preserving legitimate consecutive repeat winning numbers
 */
export function filterDuplicateSpinEvents(existingSpins: SpinItem[], incomingNumbers: string[]): string[] {
  if (existingSpins.length === 0) return incomingNumbers;

  const existingNumbers = existingSpins.map((s) => s.number);
  const tailLength = Math.min(existingNumbers.length, 10);
  const tail = existingNumbers.slice(-tailLength);

  let startIndex = 0;
  for (let i = 0; i < incomingNumbers.length; i++) {
    let match = true;
    for (let j = 0; j < tail.length; j++) {
      if (i + j >= incomingNumbers.length || incomingNumbers[i + j] !== tail[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      startIndex = i + tail.length;
      break;
    }
  }

  return incomingNumbers.slice(startIndex);
}

/**
 * Build Import Preview Payload for user confirmation modal
 */
export function buildImportPreviewPayload(
  game: DiscoveredGame,
  rawNumbers: string[],
  existingSpins: SpinItem[],
  targetSessionId: string,
  targetSessionName: string,
  extractionMethod: IntegrationMethod = 'browser_extension'
): ImportPreviewPayload {
  const validated = rawNumbers.filter((n) => isValidRouletteNumber(n, game.wheelType));
  const newUnique = filterDuplicateSpinEvents(existingSpins, validated);
  const duplicateCount = validated.length - newUnique.length;

  return {
    gameId: game.id,
    gameName: game.name,
    wheelType: game.wheelType,
    rawNumbersFound: rawNumbers,
    validatedNumbers: validated,
    chronologicalOrder: 'oldest_first',
    duplicateCount,
    newUniqueNumbers: newUnique,
    targetSessionId,
    targetSessionName,
    extractionMethod,
  };
}

/**
 * Discover roulette games from catalog with accurate status separation
 */
export async function discoverCasinoScoresGames(): Promise<{
  discovered: DiscoveredGame[];
  unsupported: { name: string; reason: string }[];
  methodUsed: IntegrationMethod;
}> {
  const discovered: DiscoveredGame[] = [];
  const unsupported: { name: string; reason: string }[] = [];

  for (const item of CASINO_SCORES_ROULETTE_CATALOG) {
    if (!isRouletteGame(item.name)) {
      unsupported.push({ name: item.name, reason: 'Excluded: Non-roulette game type' });
      continue;
    }

    discovered.push({
      ...item,
      extractionMethod: 'browser_extension',
      connectionState: 'disconnected',
      resultsAccessible: true,
      importedResultsCount: 0,
    });
  }

  return {
    discovered,
    unsupported,
    methodUsed: 'browser_extension',
  };
}
