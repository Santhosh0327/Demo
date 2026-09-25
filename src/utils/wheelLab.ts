import { WheelType } from '../types/roulette';
import { AMERICAN_WHEEL_SEQUENCE, EUROPEAN_WHEEL_SEQUENCE, getWheelSequence } from './rouletteRules';

export interface SectorDefinition {
  id: string;
  name: string;
  numbers: string[];
  color: string;
}

export const EUROPEAN_SECTORS: SectorDefinition[] = [
  {
    id: 'voisins',
    name: 'Voisins du Zéro (17 numbers)',
    numbers: ['22', '18', '29', '7', '28', '12', '35', '3', '26', '0', '32', '15', '19', '4', '21', '2', '25'],
    color: '#3B82F6',
  },
  {
    id: 'tiers',
    name: 'Tiers du Cylindre (12 numbers)',
    numbers: ['27', '13', '36', '11', '30', '8', '23', '10', '5', '24', '16', '33'],
    color: '#10B981',
  },
  {
    id: 'orphelins',
    name: 'Orphelins (8 numbers)',
    numbers: ['1', '20', '14', '31', '9', '17', '34', '6'],
    color: '#F59E0B',
  },
  {
    id: 'jeu_zero',
    name: 'Jeu Zéro (7 numbers subset)',
    numbers: ['12', '35', '3', '26', '0', '32', '15'],
    color: '#8B5CF6',
  },
];

export const AMERICAN_QUADRANTS: SectorDefinition[] = [
  {
    id: 'quad1',
    name: 'Quadrant 1 (Pockets 0..9)',
    numbers: AMERICAN_WHEEL_SEQUENCE.slice(0, 10),
    color: '#3B82F6',
  },
  {
    id: 'quad2',
    name: 'Quadrant 2 (Pockets 10..18)',
    numbers: AMERICAN_WHEEL_SEQUENCE.slice(10, 19),
    color: '#10B981',
  },
  {
    id: 'quad3',
    name: 'Quadrant 3 (Pockets 19..28)',
    numbers: AMERICAN_WHEEL_SEQUENCE.slice(19, 29),
    color: '#F59E0B',
  },
  {
    id: 'quad4',
    name: 'Quadrant 4 (Pockets 29..37)',
    numbers: AMERICAN_WHEEL_SEQUENCE.slice(29, 38),
    color: '#EC4899',
  },
];

/**
 * Shortest circular pocket distance between two numbers on wheel
 * d in [0, floor(K/2)]
 */
export function getWheelDistance(numA: string, numB: string, wheelType: WheelType): number {
  const seq = getWheelSequence(wheelType);
  const idxA = seq.indexOf(numA);
  const idxB = seq.indexOf(numB);
  if (idxA === -1 || idxB === -1) return 0;

  const K = seq.length;
  const absDiff = Math.abs(idxA - idxB);
  return Math.min(absDiff, K - absDiff);
}

/**
 * Signed pocket offset from numA to numB in clockwise wheel direction
 */
export function getSignedWheelOffset(numA: string, numB: string, wheelType: WheelType): number {
  const seq = getWheelSequence(wheelType);
  const idxA = seq.indexOf(numA);
  const idxB = seq.indexOf(numB);
  if (idxA === -1 || idxB === -1) return 0;

  const K = seq.length;
  let raw = idxB - idxA;
  if (raw > K / 2) raw -= K;
  if (raw <= -K / 2) raw += K;
  return raw;
}

/**
 * European: 2 opposite pockets (index offsets 18 and 19 because 37 is odd)
 * American: 1 opposite pocket (index offset 19 because 38 is even)
 */
export function getExactOppositePockets(numStr: string, wheelType: WheelType): string[] {
  const seq = getWheelSequence(wheelType);
  const idx = seq.indexOf(numStr);
  if (idx === -1) return [];

  const K = seq.length;
  if (wheelType === 'European') {
    return [seq[(idx + 18) % K], seq[(idx + 19) % K]];
  } else {
    return [seq[(idx + 19) % K]];
  }
}

/**
 * Circular Mean Angle and Resultant Vector Length R
 */
export interface CircularStatsResult {
  totalSpins: number;
  meanAngleRad: number;
  meanAngleDeg: number;
  meanPocketIndex: number;
  meanPocketNumber: string;
  resultantLengthR: number; // 0 (uniform) to 1 (all hits in same pocket)
  rayleighZ: number; // N * R^2
  rayleighPValue: number; // p-value for circular uniformity
  isSufficientSample: boolean;
  warningMessage?: string;
}

export function calculateCircularStats(spins: string[], wheelType: WheelType): CircularStatsResult {
  const seq = getWheelSequence(wheelType);
  const K = seq.length;
  const N = spins.length;

  if (N === 0) {
    return {
      totalSpins: 0,
      meanAngleRad: 0,
      meanAngleDeg: 0,
      meanPocketIndex: 0,
      meanPocketNumber: seq[0],
      resultantLengthR: 0,
      rayleighZ: 0,
      rayleighPValue: 1.0,
      isSufficientSample: false,
      warningMessage: 'No spins available for circular statistics.',
    };
  }

  let sumCos = 0;
  let sumSin = 0;

  spins.forEach((num) => {
    const idx = seq.indexOf(num);
    if (idx !== -1) {
      const theta = (2 * Math.PI * idx) / K;
      sumCos += Math.cos(theta);
      sumSin += Math.sin(theta);
    }
  });

  const meanCos = sumCos / N;
  const meanSin = sumSin / N;
  const R = Math.sqrt(meanCos * meanCos + meanSin * meanSin);

  let meanAngle = Math.atan2(meanSin, meanCos);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;

  const meanAngleDeg = (meanAngle * 180) / Math.PI;
  const meanPocketIdx = Math.round((meanAngle / (2 * Math.PI)) * K) % K;
  const meanPocketNumber = seq[meanPocketIdx];

  // Rayleigh test statistic Z = N * R^2
  const rayleighZ = N * R * R;
  // Rayleigh p-value approximation: p ~ exp(-Z) * (1 + (2*Z - Z^2)/(4*N))
  let pVal = Math.exp(-rayleighZ);
  if (N > 0) {
    pVal *= 1 + (2 * rayleighZ - rayleighZ * rayleighZ) / (4 * N);
  }
  pVal = Math.min(1, Math.max(0, pVal));

  const isSufficient = N >= 100;

  return {
    totalSpins: N,
    meanAngleRad: meanAngle,
    meanAngleDeg,
    meanPocketIndex: meanPocketIdx,
    meanPocketNumber,
    resultantLengthR: R,
    rayleighZ,
    rayleighPValue: pVal,
    isSufficientSample: isSufficient,
    warningMessage: !isSufficient
      ? `Sample size N = ${N} is below recommended minimum N = 100 for circular Rayleigh testing.`
      : undefined,
  };
}

/**
 * Consecutive-Spin Wheel Pocket Distance Distribution
 */
export interface WheelDistanceDistribution {
  distances: Record<number, number>; // distance -> count
  meanDistance: number;
  expectedMeanDistance: number; // ~ K/4 for fair wheel
  maxDistance: number;
}

export function calculateConsecutiveWheelDistanceDistribution(
  spins: string[],
  wheelType: WheelType
): WheelDistanceDistribution {
  const seq = getWheelSequence(wheelType);
  const K = seq.length;
  const maxD = Math.floor(K / 2);

  const distances: Record<number, number> = {};
  for (let d = 0; d <= maxD; d++) {
    distances[d] = 0;
  }

  if (spins.length < 2) {
    return {
      distances,
      meanDistance: 0,
      expectedMeanDistance: maxD / 2,
      maxDistance: maxD,
    };
  }

  let sumD = 0;
  let totalTransitions = 0;

  for (let i = 0; i < spins.length - 1; i++) {
    const dist = getWheelDistance(spins[i], spins[i + 1], wheelType);
    distances[dist] = (distances[dist] || 0) + 1;
    sumD += dist;
    totalTransitions++;
  }

  const meanD = totalTransitions > 0 ? sumD / totalTransitions : 0;
  const expectedD = maxD / 2;

  return {
    distances,
    meanDistance: meanD,
    expectedMeanDistance: expectedD,
    maxDistance: maxD,
  };
}

/**
 * Circular von Mises Kernel Density Estimation (KDE) over 37/38 pockets
 */
export function calculateCircularKDE(
  spins: string[],
  wheelType: WheelType,
  kappa: number = 4.0 // Concentration parameter bandwidth
): { pocket: string; index: number; density: number; normalizedDensity: number }[] {
  const seq = getWheelSequence(wheelType);
  const K = seq.length;
  const N = spins.length;

  if (N === 0) {
    return seq.map((num, i) => ({
      pocket: num,
      index: i,
      density: 1 / K,
      normalizedDensity: 1.0,
    }));
  }

  // Pre-calculate spin angles
  const spinAngles: number[] = [];
  spins.forEach((num) => {
    const idx = seq.indexOf(num);
    if (idx !== -1) {
      spinAngles.push((2 * Math.PI * idx) / K);
    }
  });

  const kdeResults = seq.map((num, i) => {
    const pocketAngle = (2 * Math.PI * i) / K;
    let sumKernel = 0;
    spinAngles.forEach((spinAngle) => {
      sumKernel += Math.exp(kappa * Math.cos(pocketAngle - spinAngle));
    });
    const density = sumKernel / N;
    return {
      pocket: num,
      index: i,
      density,
      normalizedDensity: 0,
    };
  });

  const totalDensity = kdeResults.reduce((acc, r) => acc + r.density, 0);
  return kdeResults.map((r) => ({
    ...r,
    normalizedDensity: totalDensity > 0 ? (r.density / totalDensity) * K : 1.0,
  }));
}

/**
 * Sector Concentration Analysis
 */
export interface SectorAnalysisResult {
  sectorId: string;
  name: string;
  color: string;
  pocketCount: number;
  observedHits: number;
  observedPercentage: number;
  expectedHits: number;
  expectedPercentage: number;
  differencePercentage: number;
}

export function calculateSectorAnalysis(spins: string[], wheelType: WheelType): SectorAnalysisResult[] {
  const sectors = wheelType === 'European' ? EUROPEAN_SECTORS : AMERICAN_QUADRANTS;
  const seq = getWheelSequence(wheelType);
  const K = seq.length;
  const N = spins.length;

  return sectors.map((sec) => {
    const pocketCount = sec.numbers.length;
    const expectedPercentage = (pocketCount / K) * 100;
    const expectedHits = (N * pocketCount) / K;

    let hits = 0;
    spins.forEach((spin) => {
      if (sec.numbers.includes(spin)) hits++;
    });

    const observedPercentage = N > 0 ? (hits / N) * 100 : 0;

    return {
      sectorId: sec.id,
      name: sec.name,
      color: sec.color,
      pocketCount,
      observedHits: hits,
      observedPercentage,
      expectedHits,
      expectedPercentage,
      differencePercentage: observedPercentage - expectedPercentage,
    };
  });
}
