import { describe, expect, it } from 'vitest';
import { calculateCategoryMath, calculateEvenMoneyZeroPayout } from '../utils/categoryLab';

describe('CategoryLab Category Mathematics Tests', () => {
  it('calculates European category statistics and theoretical probabilities', () => {
    const spins = ['1', '2', '3', '0']; // 1: Red/Odd/Low, 2: Black/Even/Low, 3: Red/Odd/Low, 0: Zero
    const res = calculateCategoryMath(spins, 'European', 'standard');
    expect(res.totalSpins).toBe(4);

    const redItem = res.categories.find((c) => c.categoryKey === 'red');
    expect(redItem?.observedCount).toBe(2);
    expect(redItem?.theoreticalPercentage).toBeCloseTo((18 / 37) * 100, 2);

    const zeroItem = res.categories.find((c) => c.categoryKey === 'zero');
    expect(zeroItem?.observedCount).toBe(1);
    expect(zeroItem?.theoreticalPercentage).toBeCloseTo((1 / 37) * 100, 2);
  });

  it('calculates American category statistics with double zero', () => {
    const spins = ['0', '00', '1'];
    const res = calculateCategoryMath(spins, 'American', 'standard');
    expect(res.categories.some((c) => c.categoryKey === 'doubleZero')).toBe(true);
  });

  it('evaluates zero rules payout mechanics correctly', () => {
    // Standard rule: zero loses full stake
    const std = calculateEvenMoneyZeroPayout(false, true, 10, 'standard');
    expect(std.netPayout).toBe(-10);
    expect(std.returnStake).toBe(0);

    // La Partage rule: 50% refund on zero
    const part = calculateEvenMoneyZeroPayout(false, true, 10, 'la_partage');
    expect(part.netPayout).toBe(-5);
    expect(part.returnStake).toBe(5);

    // En Prison rule: first zero holds stake for next spin
    const pri1 = calculateEvenMoneyZeroPayout(false, true, 10, 'en_prison', false);
    expect(pri1.netPayout).toBe(0);
    expect(pri1.returnStake).toBe(10);
    expect(pri1.nextInPrison).toBe(true);

    // En Prison second zero: loss
    const pri2 = calculateEvenMoneyZeroPayout(false, true, 10, 'en_prison', true);
    expect(pri2.netPayout).toBe(-10);
    expect(pri2.nextInPrison).toBe(false);
  });
});
