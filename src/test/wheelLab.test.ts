import { describe, expect, it } from 'vitest';
import {
  calculateCircularKDE,
  calculateCircularStats,
  calculateConsecutiveWheelDistanceDistribution,
  calculateSectorAnalysis,
  getExactOppositePockets,
  getSignedWheelOffset,
  getWheelDistance,
} from '../utils/wheelLab';

describe('WheelLab Physical Wheel Mathematics Tests', () => {
  it('calculates European wheel distance correctly', () => {
    // 0 and 32 are adjacent on EU wheel (distance = 1)
    expect(getWheelDistance('0', '32', 'European')).toBe(1);

    // 0 and 26 are adjacent in counter-clockwise direction (distance = 1)
    expect(getWheelDistance('0', '26', 'European')).toBe(1);

    // Self distance = 0
    expect(getWheelDistance('0', '0', 'European')).toBe(0);
  });

  it('calculates American wheel distance correctly', () => {
    // 0 and 28 are adjacent on US wheel (distance = 1)
    expect(getWheelDistance('0', '28', 'American')).toBe(1);
    expect(getWheelDistance('0', '2', 'American')).toBe(1);
  });

  it('calculates signed wheel offsets', () => {
    // Clockwise from 0 to 32 on EU is +1
    expect(getSignedWheelOffset('0', '32', 'European')).toBe(1);
    // Counter-clockwise from 0 to 26 on EU is -1
    expect(getSignedWheelOffset('0', '26', 'European')).toBe(-1);
  });

  it('returns exact opposite pockets for European and American wheels', () => {
    // EU wheel 0 opposite pockets (index offsets 18 and 19)
    const oppEU = getExactOppositePockets('0', 'European');
    expect(oppEU.length).toBe(2);
    expect(oppEU).toEqual(['10', '5']);

    // US wheel 0 opposite pocket (index offset 19)
    const oppUS = getExactOppositePockets('0', 'American');
    expect(oppUS.length).toBe(1);
    expect(oppUS[0]).toBe('00');
  });

  it('calculates circular mean angle and Rayleigh test', () => {
    // All spins in pocket 0 => Resultant R = 1.0
    const spins = ['0', '0', '0', '0', '0'];
    const stats = calculateCircularStats(spins, 'European');
    expect(stats.resultantLengthR).toBeCloseTo(1.0, 4);
    expect(stats.meanPocketNumber).toBe('0');
  });

  it('calculates consecutive spin distance distribution', () => {
    const spins = ['0', '32', '15'];
    const dist = calculateConsecutiveWheelDistanceDistribution(spins, 'European');
    expect(dist.distances[1]).toBe(2); // 0->32 dist 1, 32->15 dist 1
  });

  it('calculates circular KDE and sector analysis', () => {
    const spins = ['0', '32', '15', '19', '4', '21', '2', '25'];
    const kde = calculateCircularKDE(spins, 'European');
    expect(kde.length).toBe(37);

    const sectors = calculateSectorAnalysis(spins, 'European');
    expect(sectors.length).toBe(4);
    const voisins = sectors.find((s) => s.sectorId === 'voisins');
    expect(voisins?.observedHits).toBe(8);
  });
});
