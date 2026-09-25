import { WheelType } from '../types/roulette';
import { wilsonScoreInterval } from './mathLab';
import {
  BLACK_NUMBERS,
  getColumn,
  getDozen,
  getParity,
  getPocketColor,
  getRange,
  RED_NUMBERS,
} from './rouletteRules';

export type ZeroRule = 'standard' | 'la_partage' | 'en_prison';

export interface CategoryAnalysisItem {
  categoryKey: string;
  categoryName: string;
  group: '1:1 Even Money' | '2:1 Dozens & Columns' | 'Zeros';
  observedCount: number;
  observedRate: number; // 0 to 1
  observedPercentage: number; // %
  theoreticalRate: number; // 0 to 1
  theoreticalPercentage: number; // %
  differencePercentage: number; // %
  wilsonLowerCI: number;
  wilsonUpperCI: number;
  maxStreak: number;
  currentStreak: number;
}

export interface CategoryMathResult {
  totalSpins: number;
  wheelType: WheelType;
  zeroRule: ZeroRule;
  categories: CategoryAnalysisItem[];
  transitionMatrix1To1: Record<string, Record<string, number>>;
}

export function calculateCategoryMath(
  spins: string[],
  wheelType: WheelType,
  zeroRule: ZeroRule = 'standard'
): CategoryMathResult {
  const N = spins.length;
  const K = wheelType === 'European' ? 37 : 38;

  // Theoretical probability constants
  const pEvenMoneyTheoretical = 18 / K; // Red, Black, Odd, Even, Low, High
  const pDozenColTheoretical = 12 / K; // Dozens & Columns
  const pSingleZeroTheoretical = 1 / K;
  const pDoubleZeroTheoretical = wheelType === 'American' ? 1 / K : 0;

  const counts: Record<string, number> = {
    red: 0,
    black: 0,
    odd: 0,
    even: 0,
    low: 0,
    high: 0,
    dozen1: 0,
    dozen2: 0,
    dozen3: 0,
    col1: 0,
    col2: 0,
    col3: 0,
    zero: 0,
    doubleZero: 0,
  };

  const streaks: Record<string, { current: number; max: number }> = {
    red: { current: 0, max: 0 },
    black: { current: 0, max: 0 },
    odd: { current: 0, max: 0 },
    even: { current: 0, max: 0 },
    low: { current: 0, max: 0 },
    high: { current: 0, max: 0 },
    dozen1: { current: 0, max: 0 },
    dozen2: { current: 0, max: 0 },
    dozen3: { current: 0, max: 0 },
    col1: { current: 0, max: 0 },
    col2: { current: 0, max: 0 },
    col3: { current: 0, max: 0 },
  };

  // Helper to update streak
  const updateStreak = (key: string, hit: boolean) => {
    if (hit) {
      streaks[key].current++;
      streaks[key].max = Math.max(streaks[key].max, streaks[key].current);
    } else {
      streaks[key].current = 0;
    }
  };

  // Category transition tracking for Red/Black
  const transitionMatrix1To1: Record<string, Record<string, number>> = {
    Red: { Red: 0, Black: 0, Zero: 0 },
    Black: { Red: 0, Black: 0, Zero: 0 },
    Zero: { Red: 0, Black: 0, Zero: 0 },
  };

  let prevColorCategory: string | null = null;

  spins.forEach((numStr) => {
    const color = getPocketColor(numStr);
    const parity = getParity(numStr);
    const range = getRange(numStr);
    const dozen = getDozen(numStr);
    const col = getColumn(numStr);

    const isRed = color === 'red';
    const isBlack = color === 'black';
    const isOdd = parity === 'Odd';
    const isEven = parity === 'Even';
    const isLow = range === 'Low';
    const isHigh = range === 'High';
    const isD1 = dozen === '1st';
    const isD2 = dozen === '2nd';
    const isD3 = dozen === '3rd';
    const isC1 = col === '1st';
    const isC2 = col === '2nd';
    const isC3 = col === '3rd';
    const isZ = numStr === '0';
    const isDZ = numStr === '00';

    if (isRed) counts.red++;
    if (isBlack) counts.black++;
    if (isOdd) counts.odd++;
    if (isEven) counts.even++;
    if (isLow) counts.low++;
    if (isHigh) counts.high++;
    if (isD1) counts.dozen1++;
    if (isD2) counts.dozen2++;
    if (isD3) counts.dozen3++;
    if (isC1) counts.col1++;
    if (isC2) counts.col2++;
    if (isC3) counts.col3++;
    if (isZ) counts.zero++;
    if (isDZ) counts.doubleZero++;

    updateStreak('red', isRed);
    updateStreak('black', isBlack);
    updateStreak('odd', isOdd);
    updateStreak('even', isEven);
    updateStreak('low', isLow);
    updateStreak('high', isHigh);
    updateStreak('dozen1', isD1);
    updateStreak('dozen2', isD2);
    updateStreak('dozen3', isD3);
    updateStreak('col1', isC1);
    updateStreak('col2', isC2);
    updateStreak('col3', isC3);

    // Transitions
    const currentColorCategory = isRed ? 'Red' : isBlack ? 'Black' : 'Zero';
    if (prevColorCategory) {
      if (!transitionMatrix1To1[prevColorCategory]) transitionMatrix1To1[prevColorCategory] = {};
      transitionMatrix1To1[prevColorCategory][currentColorCategory] =
        (transitionMatrix1To1[prevColorCategory][currentColorCategory] || 0) + 1;
    }
    prevColorCategory = currentColorCategory;
  });

  const buildItem = (
    categoryKey: string,
    categoryName: string,
    group: '1:1 Even Money' | '2:1 Dozens & Columns' | 'Zeros',
    count: number,
    pTheoretical: number,
    streakKey?: string
  ): CategoryAnalysisItem => {
    const obsRate = N > 0 ? count / N : 0;
    const obsPct = obsRate * 100;
    const theoPct = pTheoretical * 100;
    const diffPct = obsPct - theoPct;
    const wilson = wilsonScoreInterval(count, N, 0.95);

    const strInfo = streakKey ? streaks[streakKey] : { current: 0, max: 0 };

    return {
      categoryKey,
      categoryName,
      group,
      observedCount: count,
      observedRate: obsRate,
      observedPercentage: obsPct,
      theoreticalRate: pTheoretical,
      theoreticalPercentage: theoPct,
      differencePercentage: diffPct,
      wilsonLowerCI: wilson.lower * 100,
      wilsonUpperCI: wilson.upper * 100,
      maxStreak: strInfo.max,
      currentStreak: strInfo.current,
    };
  };

  const categories: CategoryAnalysisItem[] = [
    buildItem('red', 'Red', '1:1 Even Money', counts.red, pEvenMoneyTheoretical, 'red'),
    buildItem('black', 'Black', '1:1 Even Money', counts.black, pEvenMoneyTheoretical, 'black'),
    buildItem('odd', 'Odd', '1:1 Even Money', counts.odd, pEvenMoneyTheoretical, 'odd'),
    buildItem('even', 'Even', '1:1 Even Money', counts.even, pEvenMoneyTheoretical, 'even'),
    buildItem('low', 'Low (1-18)', '1:1 Even Money', counts.low, pEvenMoneyTheoretical, 'low'),
    buildItem('high', 'High (19-36)', '1:1 Even Money', counts.high, pEvenMoneyTheoretical, 'high'),

    buildItem('dozen1', '1st Dozen (1-12)', '2:1 Dozens & Columns', counts.dozen1, pDozenColTheoretical, 'dozen1'),
    buildItem('dozen2', '2nd Dozen (13-24)', '2:1 Dozens & Columns', counts.dozen2, pDozenColTheoretical, 'dozen2'),
    buildItem('dozen3', '3rd Dozen (25-36)', '2:1 Dozens & Columns', counts.dozen3, pDozenColTheoretical, 'dozen3'),

    buildItem('col1', '1st Column', '2:1 Dozens & Columns', counts.col1, pDozenColTheoretical, 'col1'),
    buildItem('col2', '2nd Column', '2:1 Dozens & Columns', counts.col2, pDozenColTheoretical, 'col2'),
    buildItem('col3', '3rd Column', '2:1 Dozens & Columns', counts.col3, pDozenColTheoretical, 'col3'),

    buildItem('zero', 'Single Zero (0)', 'Zeros', counts.zero, pSingleZeroTheoretical),
  ];

  if (wheelType === 'American') {
    categories.push(buildItem('doubleZero', 'Double Zero (00)', 'Zeros', counts.doubleZero, pDoubleZeroTheoretical));
  }

  return {
    totalSpins: N,
    wheelType,
    zeroRule,
    categories,
    transitionMatrix1To1,
  };
}

/**
 * Calculates payout multiplier and return multiplier for even-money bets under zero rules
 * (Standard, La Partage, En Prison)
 */
export function calculateEvenMoneyZeroPayout(
  isWin: boolean,
  isZero: boolean,
  stake: number,
  zeroRule: ZeroRule,
  wasInPrison: boolean = false
): { netPayout: number; returnStake: number; nextInPrison: boolean } {
  if (isWin) {
    // Standard win payout 1:1
    return { netPayout: stake, returnStake: stake, nextInPrison: false };
  }

  if (!isZero) {
    // Direct loss
    return { netPayout: -stake, returnStake: 0, nextInPrison: false };
  }

  // Zero occurred!
  if (zeroRule === 'la_partage') {
    // 50% refund of stake
    return { netPayout: -0.5 * stake, returnStake: 0.5 * stake, nextInPrison: false };
  }

  if (zeroRule === 'en_prison') {
    if (wasInPrison) {
      // Second zero while in prison = loss
      return { netPayout: -stake, returnStake: 0, nextInPrison: false };
    }
    // Placed in prison for next spin
    return { netPayout: 0, returnStake: stake, nextInPrison: true };
  }

  // Standard rule: zero means full loss
  return { netPayout: -stake, returnStake: 0, nextInPrison: false };
}
