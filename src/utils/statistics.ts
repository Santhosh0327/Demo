import { SpinItem, StatisticalSummary, StreakStats, WheelType } from '../types/roulette';
import {
  getAllWheelNumbers,
  getColumn,
  getDozen,
  getOppositePockets,
  getParity,
  getPocketColor,
  getRange,
} from './rouletteRules';

export function calculateStatistics(
  spins: SpinItem[],
  wheelType: WheelType,
  windowSize: number = 50
): StatisticalSummary {
  // Use rolling window of latest N spins
  const activeSpins = spins.slice(-windowSize);
  const totalSpins = activeSpins.length;
  const allNumbers = getAllWheelNumbers(wheelType);
  
  // Frequency map
  const frequencies: Record<string, number> = {};
  allNumbers.forEach((num) => {
    frequencies[num] = 0;
  });
  activeSpins.forEach((spin) => {
    if (frequencies[spin.number] !== undefined) {
      frequencies[spin.number]++;
    } else {
      frequencies[spin.number] = 1;
    }
  });

  // Last seen map for cold numbers (distance from latest spin)
  const lastSeenMap: Record<string, number> = {};
  allNumbers.forEach((num) => {
    lastSeenMap[num] = 999; // default large number if never seen in window
  });
  activeSpins.forEach((spin, index) => {
    // distance from latest: totalSpins - 1 - index
    lastSeenMap[spin.number] = totalSpins - 1 - index;
  });

  // Hot numbers (top 5 frequent)
  const hotNumbers = allNumbers
    .map((num) => ({
      number: num,
      count: frequencies[num] || 0,
      percentage: totalSpins > 0 ? ((frequencies[num] || 0) / totalSpins) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || lastSeenMap[a.number] - lastSeenMap[b.number])
    .slice(0, 5);

  // Cold numbers (top 5 longest absent or least frequent)
  const coldNumbers = allNumbers
    .map((num) => ({
      number: num,
      count: frequencies[num] || 0,
      lastSeenAgo: lastSeenMap[num],
    }))
    .sort((a, b) => b.lastSeenAgo - a.lastSeenAgo || a.count - b.count)
    .slice(0, 5);

  // Category stats (excluding green 0/00 from dozens, columns, parity, range)
  const categoryStats = {
    red: 0,
    black: 0,
    green: 0,
    odd: 0,
    even: 0,
    high: 0,
    low: 0,
    dozen1: 0,
    dozen2: 0,
    dozen3: 0,
    col1: 0,
    col2: 0,
    col3: 0,
  };

  activeSpins.forEach((spin) => {
    const color = getPocketColor(spin.number);
    if (color === 'red') categoryStats.red++;
    else if (color === 'black') categoryStats.black++;
    else categoryStats.green++;

    const parity = getParity(spin.number);
    if (parity === 'Odd') categoryStats.odd++;
    else if (parity === 'Even') categoryStats.even++;

    const range = getRange(spin.number);
    if (range === 'Low') categoryStats.low++;
    else if (range === 'High') categoryStats.high++;

    const dozen = getDozen(spin.number);
    if (dozen === '1st') categoryStats.dozen1++;
    else if (dozen === '2nd') categoryStats.dozen2++;
    else if (dozen === '3rd') categoryStats.dozen3++;

    const col = getColumn(spin.number);
    if (col === '1st') categoryStats.col1++;
    else if (col === '2nd') categoryStats.col2++;
    else if (col === '3rd') categoryStats.col3++;
  });

  // Historical transitions matrix: transition[prevNum][nextNum] = count
  const transitions: Record<string, Record<string, number>> = {};
  for (let i = 0; i < activeSpins.length - 1; i++) {
    const prev = activeSpins[i].number;
    const next = activeSpins[i + 1].number;
    if (!transitions[prev]) transitions[prev] = {};
    transitions[prev][next] = (transitions[prev][next] || 0) + 1;
  }

  // Physical opposite pocket hits count
  const oppositeHitsMap: Record<string, { opposite: string; count: number }> = {};
  for (let i = 0; i < activeSpins.length - 1; i++) {
    const current = activeSpins[i].number;
    const next = activeSpins[i + 1].number;
    const opps = getOppositePockets(current, wheelType);
    if (opps.includes(next)) {
      const key = `${current}->${next}`;
      if (!oppositeHitsMap[key]) {
        oppositeHitsMap[key] = { opposite: next, count: 0 };
      }
      oppositeHitsMap[key].count++;
    }
  }

  const oppositePocketHits = Object.entries(oppositeHitsMap).map(([key, val]) => ({
    target: key.split('->')[0],
    opposite: val.opposite,
    count: val.count,
  }));

  // Streaks and Repeated Pairs / Triples Analysis
  let maxRed = 0, currentRed = 0;
  let maxBlack = 0, currentBlack = 0;
  let maxOdd = 0, currentOdd = 0;
  let maxEven = 0, currentEven = 0;

  const pairCounts: Record<string, number> = {};
  const tripleCounts: Record<string, number> = {};

  for (let i = 0; i < activeSpins.length; i++) {
    const color = getPocketColor(activeSpins[i].number);
    if (color === 'red') {
      currentRed++;
      maxRed = Math.max(maxRed, currentRed);
      currentBlack = 0;
    } else if (color === 'black') {
      currentBlack++;
      maxBlack = Math.max(maxBlack, currentBlack);
      currentRed = 0;
    } else {
      currentRed = 0;
      currentBlack = 0;
    }

    const parity = getParity(activeSpins[i].number);
    if (parity === 'Odd') {
      currentOdd++;
      maxOdd = Math.max(maxOdd, currentOdd);
      currentEven = 0;
    } else if (parity === 'Even') {
      currentEven++;
      maxEven = Math.max(maxEven, currentEven);
      currentOdd = 0;
    } else {
      currentOdd = 0;
      currentEven = 0;
    }

    // Pairs check
    if (i >= 1 && activeSpins[i].number === activeSpins[i - 1].number) {
      const num = activeSpins[i].number;
      pairCounts[num] = (pairCounts[num] || 0) + 1;
    }

    // Triples check
    if (i >= 2 && activeSpins[i].number === activeSpins[i - 1].number && activeSpins[i - 1].number === activeSpins[i - 2].number) {
      const num = activeSpins[i].number;
      tripleCounts[num] = (tripleCounts[num] || 0) + 1;
    }
  }

  const streaks: StreakStats = {
    maxRedStreak: maxRed,
    maxBlackStreak: maxBlack,
    maxOddStreak: maxOdd,
    maxEvenStreak: maxEven,
    repeatedPairs: Object.entries(pairCounts).map(([number, count]) => ({ number, count })),
    repeatedTriples: Object.entries(tripleCounts).map(([number, count]) => ({ number, count })),
  };

  const lastSpin = activeSpins.length > 0 ? activeSpins[activeSpins.length - 1].number : null;

  return {
    totalSpins,
    windowSize,
    lastSpin,
    frequencies,
    hotNumbers,
    coldNumbers,
    categoryStats,
    transitions,
    oppositePocketHits,
    streaks,
  };
}
