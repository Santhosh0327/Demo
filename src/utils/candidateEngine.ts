import {
  AlgorithmWeights,
  CandidatePrediction,
  CategoryCandidate,
  NumberCandidateScore,
  SpinItem,
  WheelType,
} from '../types/roulette';
import {
  getAllWheelNumbers,
  getColumn,
  getDozen,
  getOppositePockets,
  getParity,
  getPocketColor,
  getRange,
  getWheelNeighbours,
} from './rouletteRules';
import { calculateStatistics } from './statistics';

export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  frequency: 25,
  recency: 20,
  transition: 25,
  sector: 15,
  opposite: 15,
};

export const MIN_HISTORY_REQUIRED = 3;

export function generateCandidatePrediction(
  spins: SpinItem[],
  wheelType: WheelType,
  weights: AlgorithmWeights = DEFAULT_WEIGHTS,
  windowSize: number = 50
): CandidatePrediction | null {
  if (!spins || spins.length < MIN_HISTORY_REQUIRED) {
    return null;
  }

  const allNumbers = getAllWheelNumbers(wheelType);
  const activeSpins = spins.slice(-windowSize);
  const stats = calculateStatistics(spins, wheelType, windowSize);
  const lastSpin = activeSpins.length > 0 ? activeSpins[activeSpins.length - 1].number : null;

  // 1. Frequency Raw Scores
  const maxFreq = Math.max(...Object.values(stats.frequencies), 1);
  const rawFreqScores: Record<string, number> = {};
  allNumbers.forEach((num) => {
    rawFreqScores[num] = (stats.frequencies[num] || 0) / maxFreq;
  });

  // 2. Recency Raw Scores (Higher score for numbers that appeared moderately recently or due)
  const lastSeenMap: Record<string, number> = {};
  allNumbers.forEach((num) => {
    lastSeenMap[num] = 999;
  });
  activeSpins.forEach((spin, idx) => {
    const dist = activeSpins.length - 1 - idx;
    lastSeenMap[spin.number] = dist;
  });

  const rawRecencyScores: Record<string, number> = {};
  allNumbers.forEach((num) => {
    const ago = lastSeenMap[num];
    if (ago === 999) {
      rawRecencyScores[num] = 0.1; // absent in active window
    } else {
      const recencyBonus = Math.exp(-ago / 10);
      rawRecencyScores[num] = recencyBonus;
    }
  });

  // 3. Historical Transition Scores (Numbers following lastSpin)
  const rawTransitionScores: Record<string, number> = {};
  allNumbers.forEach((num) => {
    rawTransitionScores[num] = 0;
  });

  if (lastSpin && stats.transitions[lastSpin]) {
    const lastTransitions = stats.transitions[lastSpin];
    const maxTransCount = Math.max(...Object.values(lastTransitions), 1);
    Object.entries(lastTransitions).forEach(([nextNum, count]) => {
      rawTransitionScores[nextNum] = count / maxTransCount;
    });
  }

  // 4. Wheel Sector Scores (Neighbours of recent 5 spins)
  const rawSectorScores: Record<string, number> = {};
  allNumbers.forEach((num) => {
    rawSectorScores[num] = 0;
  });

  const recent5Spins = activeSpins.slice(-5);
  recent5Spins.forEach((spin, idx) => {
    const weightFactor = (idx + 1) / recent5Spins.length; // 0.2 to 1.0
    const neighbours = getWheelNeighbours(spin.number, wheelType, 2);
    neighbours.forEach((nbr) => {
      rawSectorScores[nbr] = (rawSectorScores[nbr] || 0) + 0.2 * weightFactor;
    });
  });

  const maxSector = Math.max(...Object.values(rawSectorScores), 1);
  allNumbers.forEach((num) => {
    rawSectorScores[num] = rawSectorScores[num] / maxSector;
  });

  // 5. Opposite Sector Scores (Opposite pockets of recent 5 spins)
  const rawOppositeScores: Record<string, number> = {};
  allNumbers.forEach((num) => {
    rawOppositeScores[num] = 0;
  });

  recent5Spins.forEach((spin, idx) => {
    const weightFactor = (idx + 1) / recent5Spins.length;
    const opps = getOppositePockets(spin.number, wheelType);
    opps.forEach((oppNum) => {
      const oppNbrs = getWheelNeighbours(oppNum, wheelType, 1);
      oppNbrs.forEach((n) => {
        rawOppositeScores[n] = (rawOppositeScores[n] || 0) + 0.25 * weightFactor;
      });
    });
  });

  const maxOpposite = Math.max(...Object.values(rawOppositeScores), 1);
  allNumbers.forEach((num) => {
    rawOppositeScores[num] = rawOppositeScores[num] / maxOpposite;
  });

  // Total weight normalization
  const totalWeightSum =
    weights.frequency + weights.recency + weights.transition + weights.sector + weights.opposite || 100;

  const wFreq = weights.frequency / totalWeightSum;
  const wRec = weights.recency / totalWeightSum;
  const wTrans = weights.transition / totalWeightSum;
  const wSec = weights.sector / totalWeightSum;
  const wOpp = weights.opposite / totalWeightSum;

  // Compute final score for each number
  const candidateScores: NumberCandidateScore[] = allNumbers.map((num) => {
    const fScore = Math.round((rawFreqScores[num] || 0) * 100);
    const rScore = Math.round((rawRecencyScores[num] || 0) * 100);
    const tScore = Math.round((rawTransitionScores[num] || 0) * 100);
    const sScore = Math.round((rawSectorScores[num] || 0) * 100);
    const oScore = Math.round((rawOppositeScores[num] || 0) * 100);

    const totalScore = Math.round(
      fScore * wFreq + rScore * wRec + tScore * wTrans + sScore * wSec + oScore * wOpp
    );

    let explanation = `Freq: ${fScore}%, Recency: ${rScore}%`;
    if (tScore > 0) explanation += `, Transition match: ${tScore}%`;
    if (sScore > 50) explanation += `, Sector cluster fit`;
    if (oScore > 50) explanation += `, Opposite pocket bias`;

    return {
      number: num,
      color: getPocketColor(num),
      totalScore,
      freqScore: fScore,
      recencyScore: rScore,
      transitionScore: tScore,
      sectorScore: sScore,
      oppositeScore: oScore,
      rank: 0,
      explanation,
    };
  });

  // Sort descending by totalScore with deterministic tie-breaking (numeric string compare)
  candidateScores.sort(
    (a, b) => b.totalScore - a.totalScore || a.number.localeCompare(b.number, undefined, { numeric: true })
  );
  candidateScores.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Select EXACTLY 18 distinct top candidate numbers
  const candidateNumbers = candidateScores.slice(0, 18).map((c) => c.number);

  // Generate Category Candidates (Red/Black, Dozen, Column, Odd/Even, High/Low)
  const categoryCandidates = {
    redBlack: predictRedBlack(stats),
    dozen: predictDozen(stats),
    column: predictColumn(stats),
    oddEven: predictParity(stats),
    highLow: predictRange(stats),
  };

  const predictionId = `pred_${spins.length}_${Date.now()}`;

  return {
    id: predictionId,
    sessionId: spins.length > 0 ? spins[0].sessionId : 'default',
    timestamp: Date.now(),
    spinIndex: spins.length,
    candidateNumbers,
    candidateScores,
    categoryCandidates,
    weightsUsed: { ...weights },
  };
}

function predictRedBlack(stats: ReturnType<typeof calculateStatistics>): CategoryCandidate {
  const red = stats.categoryStats.red;
  const black = stats.categoryStats.black;
  const total = red + black;

  if (total === 0) {
    return { categoryType: 'RedBlack', candidate: 'Red', confidence: 50, explanation: 'No Red/Black occurrences in window.' };
  }

  let cand = 'Red';
  let conf = 50;
  let exp = '';

  if (red > black) {
    cand = 'Red';
    conf = Math.round((red / total) * 100);
    exp = `Red leads recent window (${red} vs ${black} hits).`;
  } else if (black > red) {
    cand = 'Black';
    conf = Math.round((black / total) * 100);
    exp = `Black leads recent window (${black} vs ${red} hits).`;
  } else {
    cand = 'Red';
    conf = 50;
    exp = `Red and Black are equal (${red} hits each).`;
  }

  return { categoryType: 'RedBlack', candidate: cand, confidence: conf, explanation: exp };
}

function predictDozen(stats: ReturnType<typeof calculateStatistics>): CategoryCandidate {
  const d1 = stats.categoryStats.dozen1;
  const d2 = stats.categoryStats.dozen2;
  const d3 = stats.categoryStats.dozen3;

  let cand = '1st Dozen';
  let maxVal = d1;
  if (d2 > maxVal) { cand = '2nd Dozen'; maxVal = d2; }
  if (d3 > maxVal) { cand = '3rd Dozen'; maxVal = d3; }

  const total = d1 + d2 + d3;
  if (total === 0) {
    return { categoryType: 'Dozen', candidate: '1st Dozen', confidence: 33, explanation: 'No dozen occurrences in window.' };
  }

  const conf = Math.round((maxVal / total) * 100);
  const exp = `${cand} leads with ${maxVal} of ${total} dozen hits.`;

  return { categoryType: 'Dozen', candidate: cand, confidence: conf, explanation: exp };
}

function predictColumn(stats: ReturnType<typeof calculateStatistics>): CategoryCandidate {
  const c1 = stats.categoryStats.col1;
  const c2 = stats.categoryStats.col2;
  const c3 = stats.categoryStats.col3;

  let cand = '1st Column';
  let maxVal = c1;
  if (c2 > maxVal) { cand = '2nd Column'; maxVal = c2; }
  if (c3 > maxVal) { cand = '3rd Column'; maxVal = c3; }

  const total = c1 + c2 + c3;
  if (total === 0) {
    return { categoryType: 'Column', candidate: '1st Column', confidence: 33, explanation: 'No column occurrences in window.' };
  }

  const conf = Math.round((maxVal / total) * 100);
  const exp = `${cand} leads with ${maxVal} of ${total} column hits.`;

  return { categoryType: 'Column', candidate: cand, confidence: conf, explanation: exp };
}

function predictParity(stats: ReturnType<typeof calculateStatistics>): CategoryCandidate {
  const odd = stats.categoryStats.odd;
  const even = stats.categoryStats.even;
  const total = odd + even;

  if (total === 0) {
    return { categoryType: 'OddEven', candidate: 'Odd', confidence: 50, explanation: 'No parity occurrences in window.' };
  }

  const cand = odd >= even ? 'Odd' : 'Even';
  const val = odd >= even ? odd : even;
  const conf = Math.round((val / total) * 100);
  const exp = `${cand} numbers lead (${val} vs ${odd >= even ? even : odd} hits).`;

  return { categoryType: 'OddEven', candidate: cand, confidence: conf, explanation: exp };
}

function predictRange(stats: ReturnType<typeof calculateStatistics>): CategoryCandidate {
  const high = stats.categoryStats.high;
  const low = stats.categoryStats.low;
  const total = high + low;

  if (total === 0) {
    return { categoryType: 'HighLow', candidate: 'High', confidence: 50, explanation: 'No range occurrences in window.' };
  }

  const cand = high >= low ? 'High' : 'Low';
  const val = high >= low ? high : low;
  const conf = Math.round((val / total) * 100);
  const exp = `${cand} range leads (${val} vs ${high >= low ? low : high} hits).`;

  return { categoryType: 'HighLow', candidate: cand, confidence: conf, explanation: exp };
}
