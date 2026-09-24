import { CandidatePrediction, TrackingMetrics, WheelType } from '../types/roulette';
import { getColumn, getDozen, getParity, getPocketColor, getRange } from './rouletteRules';

export function resolvePrediction(
  prediction: CandidatePrediction,
  actualNumber: string,
  spinId: string
): CandidatePrediction {
  const hitNumber = prediction.candidateNumbers.includes(actualNumber);

  // Evaluate Red/Black
  const actualColor = getPocketColor(actualNumber);
  let hitRedBlack = false;
  if (actualColor === 'red' && prediction.categoryCandidates.redBlack.candidate === 'Red') hitRedBlack = true;
  if (actualColor === 'black' && prediction.categoryCandidates.redBlack.candidate === 'Black') hitRedBlack = true;

  // Evaluate Dozen
  const actualDozen = getDozen(actualNumber);
  let hitDozen = false;
  if (actualDozen && prediction.categoryCandidates.dozen.candidate.startsWith(actualDozen)) {
    hitDozen = true;
  }

  // Evaluate Column
  const actualCol = getColumn(actualNumber);
  let hitColumn = false;
  if (actualCol && prediction.categoryCandidates.column.candidate.startsWith(actualCol)) {
    hitColumn = true;
  }

  // Evaluate Odd/Even
  const actualParity = getParity(actualNumber);
  let hitOddEven = false;
  if (actualParity && prediction.categoryCandidates.oddEven.candidate === actualParity) {
    hitOddEven = true;
  }

  // Evaluate High/Low
  const actualRange = getRange(actualNumber);
  let hitHighLow = false;
  if (actualRange && prediction.categoryCandidates.highLow.candidate === actualRange) {
    hitHighLow = true;
  }

  return {
    ...prediction,
    resolvedSpinId: spinId,
    resolvedActualNumber: actualNumber,
    hitNumber,
    hitRedBlack,
    hitDozen,
    hitColumn,
    hitOddEven,
    hitHighLow,
  };
}

export function computeTrackingMetrics(
  predictions: CandidatePrediction[],
  wheelType: WheelType
): TrackingMetrics {
  const resolved = predictions.filter((p) => p.resolvedActualNumber !== undefined);
  const total = resolved.length;

  const denominator = wheelType === 'European' ? 37 : 38;
  const numBaseline = (18 / denominator) * 100;
  const binaryBaseline = (18 / denominator) * 100;
  const dozenColBaseline = (12 / denominator) * 100;

  if (total === 0) {
    return {
      totalPredictions: 0,
      numberHits: 0,
      numberHitRate: 0,
      numberFairBaseline: numBaseline,
      categoryMetrics: {
        redBlack: { hits: 0, total: 0, rate: 0, baseline: binaryBaseline },
        dozen: { hits: 0, total: 0, rate: 0, baseline: dozenColBaseline },
        column: { hits: 0, total: 0, rate: 0, baseline: dozenColBaseline },
        oddEven: { hits: 0, total: 0, rate: 0, baseline: binaryBaseline },
        highLow: { hits: 0, total: 0, rate: 0, baseline: binaryBaseline },
      },
      performanceHistory: [],
    };
  }

  let numberHits = 0;
  let rbHits = 0;
  let dozenHits = 0;
  let colHits = 0;
  let oeHits = 0;
  let hlHits = 0;

  const performanceHistory: TrackingMetrics['performanceHistory'] = [];

  resolved.forEach((p, idx) => {
    if (p.hitNumber) numberHits++;
    if (p.hitRedBlack) rbHits++;
    if (p.hitDozen) dozenHits++;
    if (p.hitColumn) colHits++;
    if (p.hitOddEven) oeHits++;
    if (p.hitHighLow) hlHits++;

    const cumRate = (numberHits / (idx + 1)) * 100;
    performanceHistory.push({
      spinIndex: idx + 1,
      actualNumber: p.resolvedActualNumber!,
      hitNumber: !!p.hitNumber,
      cumulativeHitRate: Math.round(cumRate * 10) / 10,
      baselineRate: Math.round(numBaseline * 10) / 10,
    });
  });

  return {
    totalPredictions: total,
    numberHits,
    numberHitRate: Math.round((numberHits / total) * 1000) / 10,
    numberFairBaseline: Math.round(numBaseline * 10) / 10,
    categoryMetrics: {
      redBlack: { hits: rbHits, total, rate: Math.round((rbHits / total) * 1000) / 10, baseline: Math.round(binaryBaseline * 10) / 10 },
      dozen: { hits: dozenHits, total, rate: Math.round((dozenHits / total) * 1000) / 10, baseline: Math.round(dozenColBaseline * 10) / 10 },
      column: { hits: colHits, total, rate: Math.round((colHits / total) * 1000) / 10, baseline: Math.round(dozenColBaseline * 10) / 10 },
      oddEven: { hits: oeHits, total, rate: Math.round((oeHits / total) * 1000) / 10, baseline: Math.round(binaryBaseline * 10) / 10 },
      highLow: { hits: hlHits, total, rate: Math.round((hlHits / total) * 1000) / 10, baseline: Math.round(binaryBaseline * 10) / 10 },
    },
    performanceHistory,
  };
}
