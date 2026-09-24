import { describe, it, expect } from 'vitest';
import { calculateStatistics } from '../utils/statistics';
import { SpinItem } from '../types/roulette';

describe('Rolling Window Statistics & Streaks Analysis', () => {
  it('strictly limits statistical evaluation to the rolling latest 50 results window', () => {
    // Generate 70 dummy spins
    const spins: SpinItem[] = Array.from({ length: 70 }, (_, i) => ({
      id: `spin_${i}`,
      sessionId: 's1',
      number: (i % 36 + 1).toString(),
      timestamp: 1000 + i * 1000,
      source: 'manual',
    }));

    const stats = calculateStatistics(spins, 'European', 50);
    expect(stats.totalSpins).toBe(50);
    expect(stats.windowSize).toBe(50);
  });

  it('correctly calculates streaks and repeated pairs / triples', () => {
    const consecutiveSpins: SpinItem[] = [
      { id: '1', sessionId: 's1', number: '7', timestamp: 1000, source: 'manual' }, // Red, Odd
      { id: '2', sessionId: 's1', number: '7', timestamp: 2000, source: 'manual' }, // Pair 7
      { id: '3', sessionId: 's1', number: '7', timestamp: 3000, source: 'manual' }, // Triple 7
      { id: '4', sessionId: 's1', number: '1', timestamp: 4000, source: 'manual' }, // Red, Odd
      { id: '5', sessionId: 's1', number: '3', timestamp: 5000, source: 'manual' }, // Red, Odd
    ];

    const stats = calculateStatistics(consecutiveSpins, 'European', 50);

    expect(stats.streaks.maxRedStreak).toBe(5);
    expect(stats.streaks.maxOddStreak).toBe(5);
    expect(stats.streaks.repeatedPairs).toContainEqual({ number: '7', count: 2 });
    expect(stats.streaks.repeatedTriples).toContainEqual({ number: '7', count: 1 });
  });
});
