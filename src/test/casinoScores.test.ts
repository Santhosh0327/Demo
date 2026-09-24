import { describe, it, expect } from 'vitest';
import {
  isRouletteGame,
  isValidRouletteNumber,
  parseCasinoScoresNumbers,
  filterDuplicateSpinEvents,
  discoverCasinoScoresGames,
  buildImportPreviewPayload,
  isUrl,
  matchGameFromUrl,
} from '../utils/casinoScores';
import { parseOcrWordsToSequence } from '../utils/screenOcrHelper';
import { SpinItem } from '../types/roulette';
import { DiscoveredGame } from '../types/casinoscores';

describe('CasinoScores Integration - Game Discovery & URL Handling', () => {
  it('identifies genuine roulette game titles correctly', () => {
    expect(isRouletteGame('Lightning Roulette')).toBe(true);
    expect(isRouletteGame('Immersive Roulette')).toBe(true);
    expect(isRouletteGame('American Roulette Live')).toBe(true);
  });

  it('strictly excludes non-roulette game shows, dice, and slot titles', () => {
    expect(isRouletteGame('Crazy Time')).toBe(false);
    expect(isRouletteGame('Monopoly Live')).toBe(false);
    expect(isRouletteGame('Sweet Bonanza Candyland')).toBe(false);
    expect(isRouletteGame('Speed Baccarat A')).toBe(false);
    expect(isRouletteGame('Lightning Dice')).toBe(false);
    expect(isRouletteGame('Ice Fishing')).toBe(false);
  });

  it('correctly detects URLs vs numbers text', () => {
    expect(isUrl('https://www.casino.org/casinoscores/lightning-roulette/')).toBe(true);
    expect(isUrl('http://casinoscores.com/mega-roulette')).toBe(true);
    expect(isUrl('https://www.casinoorg-india.com/india/casinoscores/lightning-roulette/')).toBe(true);
    expect(isUrl('17, 34, 0, 22, 15')).toBe(false);
  });

  it('matches review/reference URLs (e.g. casinoorg-india.com) and identifies official result page', () => {
    const res = matchGameFromUrl('https://www.casinoorg-india.com/india/casinoscores/lightning-roulette/');
    expect(res.isReviewPage).toBe(true);
    expect(res.game).not.toBeNull();
    expect(res.game?.id).toBe('lightning-roulette');
    expect(res.actualResultUrl).toBe('https://www.casino.org/casinoscores/lightning-roulette/');
  });

  it('matches official CasinoScores game URLs directly', () => {
    const res = matchGameFromUrl('https://www.casino.org/casinoscores/lightning-roulette/');
    expect(res.isReviewPage).toBe(false);
    expect(res.game?.id).toBe('lightning-roulette');
  });

  it('prevents parsing URL strings as roulette spin numbers', () => {
    const res = parseCasinoScoresNumbers('https://www.casino.org/casinoscores/lightning-roulette/', 'European');
    expect(res.isUrlDetected).toBe(true);
    expect(res.numbers).toEqual([]);
  });
});

describe('Screen Capture OCR - Spatial Word Parsing & Sequence Extraction', () => {
  it('parses spatial word sequence in left-to-right order while filtering RTP and BET text', () => {
    const mockWords = [
      { text: 'RTP', bbox: { x0: 10, y0: 5 } },
      { text: '97.3%', bbox: { x0: 40, y0: 5 } },
      { text: '21', bbox: { x0: 100, y0: 50 } },
      { text: '7', bbox: { x0: 140, y0: 50 } },
      { text: '27', bbox: { x0: 180, y0: 50 } },
      { text: '34', bbox: { x0: 220, y0: 50 } },
      { text: '1', bbox: { x0: 260, y0: 50 } },
      { text: 'BET', bbox: { x0: 300, y0: 50 } },
      { text: '24', bbox: { x0: 340, y0: 50 } },
      { text: '12', bbox: { x0: 380, y0: 50 } },
      { text: '0', bbox: { x0: 420, y0: 50 } },
      { text: '23', bbox: { x0: 460, y0: 50 } },
      { text: '32', bbox: { x0: 500, y0: 50 } },
    ];

    const sequence = parseOcrWordsToSequence(mockWords, 'European');
    expect(sequence).toEqual(['21', '7', '27', '34', '1', '24', '12', '0', '23', '32']);
    expect(sequence).not.toContain('RTP');
    expect(sequence).not.toContain('BET');
  });
});

describe('CasinoScores Integration - Import Preview & De-duplication', () => {
  it('validates European and American roulette numbers', () => {
    expect(isValidRouletteNumber('0', 'European')).toBe(true);
    expect(isValidRouletteNumber('17', 'European')).toBe(true);
    expect(isValidRouletteNumber('36', 'European')).toBe(true);
    expect(isValidRouletteNumber('00', 'European')).toBe(false);
    expect(isValidRouletteNumber('00', 'American')).toBe(true);
  });

  it('builds import preview payload with exact duplicate count and new spin events', () => {
    const mockGame: DiscoveredGame = {
      id: 'lightning-roulette',
      sourceWebsite: 'https://casinoscores.com',
      name: 'Lightning Roulette',
      url: 'https://www.casino.org/casinoscores/lightning-roulette/',
      wheelType: 'European',
      supportedFilters: [],
      extractionMethod: 'browser_extension',
      connectionState: 'disconnected',
      resultsAccessible: true,
      importedResultsCount: 0,
    };

    const existingSpins: SpinItem[] = [
      { id: '1', sessionId: 's1', number: '17', timestamp: 1000, source: 'manual' },
      { id: '2', sessionId: 's1', number: '34', timestamp: 2000, source: 'manual' },
    ];

    const rawExtracted = ['17', '34', '6', '27'];
    const payload = buildImportPreviewPayload(
      mockGame,
      rawExtracted,
      existingSpins,
      's1',
      'Main Session',
      'browser_extension'
    );

    expect(payload.gameName).toBe('Lightning Roulette');
    expect(payload.validatedNumbers).toEqual(['17', '34', '6', '27']);
    expect(payload.newUniqueNumbers).toEqual(['6', '27']);
    expect(payload.duplicateCount).toBe(2);
  });
});
