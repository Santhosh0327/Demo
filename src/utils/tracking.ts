import { CandidatePrediction, ConsolidatedEvaluationRecord, TrackingMetrics, WheelType } from '../types/roulette';
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

export function computeTrackingMetricsFromEvaluations(
  evaluations: ConsolidatedEvaluationRecord[],
  wheelType: WheelType
): TrackingMetrics {
  const verified = evaluations.filter((e) => e.result === 'HIT' || e.result === 'MISS');
  const total = verified.length;

  const denominator = wheelType === 'European' ? 37 : 38;
  const numBaseline = (18 / denominator) * 100;
  const binaryBaseline = (18 / denominator) * 100;
  const dozenColBaseline = (12 / denominator) * 100;

  if (total === 0) {
    return {
      totalPredictions: 0,
      numberHits: 0,
      numberHitRate: 0,
      numberFairBaseline: Math.round(numBaseline * 10) / 10,
      categoryMetrics: {
        redBlack: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
        dozen: { hits: 0, total: 0, rate: 0, baseline: Math.round(dozenColBaseline * 10) / 10 },
        column: { hits: 0, total: 0, rate: 0, baseline: Math.round(dozenColBaseline * 10) / 10 },
        oddEven: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
        highLow: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
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

  verified.forEach((e) => {
    const isHit = e.result === 'HIT';
    if (isHit) numberHits++;

    const actualNumber = e.spinNumber;
    const actualColor = getPocketColor(actualNumber);
    if (actualColor === 'red' || actualColor === 'black') rbHits++;

    const actualDozen = getDozen(actualNumber);
    if (actualDozen) dozenHits++;

    const actualCol = getColumn(actualNumber);
    if (actualCol) colHits++;

    const actualParity = getParity(actualNumber);
    if (actualParity) oeHits++;

    const actualRange = getRange(actualNumber);
    if (actualRange) hlHits++;

    const cumRate = (numberHits / (performanceHistory.length + 1)) * 100;

    performanceHistory.push({
      spinIndex: e.spinIndex,
      actualNumber: e.spinNumber,
      hitNumber: isHit,
      cumulativeHitRate: Math.round(cumRate * 10) / 10,
      baselineRate: Math.round(numBaseline * 10) / 10,
      snapshotId: e.snapshotId || undefined,
      snapshotVersion: e.snapshotVersion || undefined,
      snapshotTimestamp: e.snapshotTimestamp || undefined,
      snapshotCutoff: e.snapshotCutoff || undefined,
      candidateNumbers: e.evaluatedNumbers,
      verificationStatus: e.verificationStatus || (isHit ? 'VERIFIED_HIT' : 'VERIFIED_MISS'),
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
      numberFairBaseline: Math.round(numBaseline * 10) / 10,
      categoryMetrics: {
        redBlack: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
        dozen: { hits: 0, total: 0, rate: 0, baseline: Math.round(dozenColBaseline * 10) / 10 },
        column: { hits: 0, total: 0, rate: 0, baseline: Math.round(dozenColBaseline * 10) / 10 },
        oddEven: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
        highLow: { hits: 0, total: 0, rate: 0, baseline: Math.round(binaryBaseline * 10) / 10 },
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

  resolved.forEach((p) => {
    if (p.hitNumber) numberHits++;
    if (p.hitRedBlack) rbHits++;
    if (p.hitDozen) dozenHits++;
    if (p.hitColumn) colHits++;
    if (p.hitOddEven) oeHits++;
    if (p.hitHighLow) hlHits++;

    const cumRate = (numberHits / (performanceHistory.length + 1)) * 100;
    performanceHistory.push({
      spinIndex: p.spinIndex,
      actualNumber: p.resolvedActualNumber!,
      hitNumber: !!p.hitNumber,
      cumulativeHitRate: Math.round(cumRate * 10) / 10,
      baselineRate: Math.round(numBaseline * 10) / 10,
      snapshotId: p.id,
      candidateNumbers: p.candidateNumbers,
      verificationStatus: p.hitNumber ? 'VERIFIED_HIT' : 'VERIFIED_MISS',
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
