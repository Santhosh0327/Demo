import { WheelType } from '../types/roulette';
import { calculateBayesianSmoothedProbabilities } from './mathLab';
import { getAllWheelNumbers, getWheelNeighbours, getWheelSequence } from './rouletteRules';
import { getExactOppositePockets } from './wheelLab';

export type CandidateMethodId =
  | 'frequency'
  | 'recency'
  | 'transition'
  | 'wheel_neighbour'
  | 'opposite_pocket'
  | 'sector'
  | 'bayesian'
  | 'weighted_ensemble';

export interface CandidateEngineConfig {
  method: CandidateMethodId;
  minSpinsRequired: number;
  historyCutoff: number; // sample window or length
  wheelType: WheelType;
  priorAlpha?: number; // for Bayesian
  neighbourRadius?: number; // for Wheel Neighbour (default 8 => 17-18 pockets)
  ensembleWeights?: {
    frequency: number;
    recency: number;
    transition: number;
    neighbour: number;
    opposite: number;
    sector: number;
    bayesian: number;
  };
}

export interface CandidateSnapshotRecord {
  id: string;
  timestamp: number;
  method: CandidateMethodId;
  parameters: CandidateEngineConfig;
  sourceSessionId: string;
  historyCutoff: number;
  selectedNumbers: string[]; // EXACTLY 18 numbers
  isSufficientData: boolean;
  modelVersion: string;
  disclaimer: string;
}

export const LAB_MODEL_VERSION = '1.0.0-LAB-EXP';
export const CANDIDATE_ENGINE_DISCLAIMER =
  'EXPERIMENTAL CANDIDATE SELECTION ONLY. Roulettes spins are independent under standard fair-wheel physics. Scores and selection algorithms do NOT establish calibrated winning probabilities or eliminate the house edge.';

/**
 * Deterministic tie-breaker for candidate numbers
 */
function sortNumbersDeterministically(
  numbers: string[],
  scores: Record<string, number>,
  ascending: boolean = false
): string[] {
  return [...numbers].sort((a, b) => {
    const diff = ascending ? scores[a] - scores[b] : scores[b] - scores[a];
    if (Math.abs(diff) > 1e-9) return diff;
    // Deterministic tie-break by string order ('0', '00', '1', '2'...)
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

/**
 * Frequency-Based 18-Number Selection
 */
export function selectByFrequency(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const allNumbers = getAllWheelNumbers(wheelType);
  const freq: Record<string, number> = {};
  allNumbers.forEach((n) => (freq[n] = 0));
  spins.forEach((n) => {
    if (freq[n] !== undefined) freq[n]++;
  });

  const sorted = sortNumbersDeterministically(allNumbers, freq, false);
  return sorted.slice(0, 18);
}

/**
 * Recency-Based 18-Number Selection (Most recently seen 18 numbers)
 */
export function selectByRecency(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const allNumbers = getAllWheelNumbers(wheelType);
  const lastSeenMap: Record<string, number> = {};
  allNumbers.forEach((n) => (lastSeenMap[n] = -999999)); // larger = more recent

  spins.forEach((n, idx) => {
    lastSeenMap[n] = idx;
  });

  const sorted = sortNumbersDeterministically(allNumbers, lastSeenMap, false);
  return sorted.slice(0, 18);
}

/**
 * Transition-Based 18-Number Selection (Following the last winning number)
 */
export function selectByTransition(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const allNumbers = getAllWheelNumbers(wheelType);
  const lastSpin = spins[spins.length - 1];

  // Count transitions from lastSpin -> nextNum in history
  const transitionCounts: Record<string, number> = {};
  allNumbers.forEach((n) => (transitionCounts[n] = 0));

  for (let i = 0; i < spins.length - 1; i++) {
    if (spins[i] === lastSpin) {
      const nextNum = spins[i + 1];
      transitionCounts[nextNum] = (transitionCounts[nextNum] || 0) + 1;
    }
  }

  const sorted = sortNumbersDeterministically(allNumbers, transitionCounts, false);
  return sorted.slice(0, 18);
}

/**
 * Wheel-Neighbour 18-Number Selection (9 pockets left & 8 pockets right of last spin)
 */
export function selectByWheelNeighbour(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10,
  radius: number = 8
): string[] {
  if (spins.length < minSpins) return [];
  const lastSpin = spins[spins.length - 1];
  const seq = getWheelSequence(wheelType);
  const idx = seq.indexOf(lastSpin);
  if (idx === -1) return seq.slice(0, 18);

  const len = seq.length;
  const selectedSet = new Set<string>();

  // Pick 18 pockets around lastSpin: lastSpin + 9 left + 8 right
  for (let offset = -radius; offset <= radius + 1; offset++) {
    if (selectedSet.size >= 18) break;
    const wrappedIdx = (idx + offset + len * 100) % len;
    selectedSet.add(seq[wrappedIdx]);
  }

  // If still under 18, fill deterministically from sequence
  if (selectedSet.size < 18) {
    seq.forEach((n) => {
      if (selectedSet.size < 18) selectedSet.add(n);
    });
  }

  return Array.from(selectedSet).slice(0, 18);
}

/**
 * Opposite-Pocket 18-Number Selection (18 pockets centered around exact opposite pocket)
 */
export function selectByOppositePocket(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const lastSpin = spins[spins.length - 1];
  const oppPockets = getExactOppositePockets(lastSpin, wheelType);
  const primaryOpposite = oppPockets[0];

  const seq = getWheelSequence(wheelType);
  const idx = seq.indexOf(primaryOpposite);
  if (idx === -1) return seq.slice(0, 18);

  const len = seq.length;
  const selectedSet = new Set<string>();

  for (let offset = -8; offset <= 9; offset++) {
    if (selectedSet.size >= 18) break;
    const wrappedIdx = (idx + offset + len * 100) % len;
    selectedSet.add(seq[wrappedIdx]);
  }

  if (selectedSet.size < 18) {
    seq.forEach((n) => {
      if (selectedSet.size < 18) selectedSet.add(n);
    });
  }

  return Array.from(selectedSet).slice(0, 18);
}

/**
 * Sector-Based 18-Number Selection (Top 18 pockets from Voisins / active sectors or quadrants)
 */
export function selectBySector(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const seq = getWheelSequence(wheelType);
  const len = seq.length;
  const sectorScores: Record<string, number> = {};
  seq.forEach((n) => (sectorScores[n] = 0));

  // Compute physical wheel sector density for every pocket from spin history
  spins.forEach((spinNum) => {
    const idx = seq.indexOf(spinNum);
    if (idx !== -1) {
      for (let offset = -2; offset <= 2; offset++) {
        const wrappedIdx = (idx + offset + len * 100) % len;
        sectorScores[seq[wrappedIdx]] = (sectorScores[seq[wrappedIdx]] || 0) + (3 - Math.abs(offset));
      }
    }
  });

  const sorted = sortNumbersDeterministically(seq, sectorScores, false);
  return sorted.slice(0, 18);
}

/**
 * Bayesian-Smoothed Historical Frequency 18-Number Selection
 */
export function selectByBayesianSmoothing(
  spins: string[],
  wheelType: WheelType,
  minSpins: number = 10,
  priorAlpha: number = 1.0
): string[] {
  if (spins.length < minSpins) return [];
  const allNumbers = getAllWheelNumbers(wheelType);
  const freq: Record<string, number> = {};
  allNumbers.forEach((n) => (freq[n] = 0));
  spins.forEach((n) => {
    if (freq[n] !== undefined) freq[n]++;
  });

  const bayesianRes = calculateBayesianSmoothedProbabilities(freq, wheelType, spins.length, priorAlpha);
  const scores: Record<string, number> = {};
  allNumbers.forEach((n) => {
    scores[n] = bayesianRes[n].posteriorProbability;
  });

  const sorted = sortNumbersDeterministically(allNumbers, scores, false);
  return sorted.slice(0, 18);
}

/**
 * Configurable Weighted Ensemble 18-Number Selection
 */
export function selectByWeightedEnsemble(
  spins: string[],
  wheelType: WheelType,
  weights: CandidateEngineConfig['ensembleWeights'],
  minSpins: number = 10
): string[] {
  if (spins.length < minSpins) return [];
  const allNumbers = getAllWheelNumbers(wheelType);
  const w = weights || {
    frequency: 20,
    recency: 20,
    transition: 20,
    neighbour: 15,
    opposite: 10,
    sector: 5,
    bayesian: 10,
  };

  const totalW =
    w.frequency + w.recency + w.transition + w.neighbour + w.opposite + w.sector + w.bayesian;

  if (totalW === 0) return allNumbers.slice(0, 18);

  // Get candidates from sub-methods
  const cFreq = new Set(selectByFrequency(spins, wheelType, minSpins));
  const cRec = new Set(selectByRecency(spins, wheelType, minSpins));
  const cTrans = new Set(selectByTransition(spins, wheelType, minSpins));
  const cNeigh = new Set(selectByWheelNeighbour(spins, wheelType, minSpins));
  const cOpp = new Set(selectByOppositePocket(spins, wheelType, minSpins));
  const cSec = new Set(selectBySector(spins, wheelType, minSpins));
  const cBayes = new Set(selectByBayesianSmoothing(spins, wheelType, minSpins));

  const ensembleScores: Record<string, number> = {};
  allNumbers.forEach((n) => {
    let score = 0;
    if (cFreq.has(n)) score += w.frequency;
    if (cRec.has(n)) score += w.recency;
    if (cTrans.has(n)) score += w.transition;
    if (cNeigh.has(n)) score += w.neighbour;
    if (cOpp.has(n)) score += w.opposite;
    if (cSec.has(n)) score += w.sector;
    if (cBayes.has(n)) score += w.bayesian;
    ensembleScores[n] = score;
  });

  const sorted = sortNumbersDeterministically(allNumbers, ensembleScores, false);
  return sorted.slice(0, 18);
}

/**
 * Main experimental 18-number engine executor
 */
export function generateExperimentalCandidates(
  spins: string[],
  config: CandidateEngineConfig,
  sessionId: string = 'active_session'
): CandidateSnapshotRecord {
  const { method, minSpinsRequired, historyCutoff, wheelType, priorAlpha, neighbourRadius, ensembleWeights } =
    config;

  const activeSpins = spins.slice(-historyCutoff);
  const isSufficient = activeSpins.length >= minSpinsRequired;

  let selectedNumbers: string[] = [];

  if (isSufficient) {
    switch (method) {
      case 'frequency':
        selectedNumbers = selectByFrequency(activeSpins, wheelType, minSpinsRequired);
        break;
      case 'recency':
        selectedNumbers = selectByRecency(activeSpins, wheelType, minSpinsRequired);
        break;
      case 'transition':
        selectedNumbers = selectByTransition(activeSpins, wheelType, minSpinsRequired);
        break;
      case 'wheel_neighbour':
        selectedNumbers = selectByWheelNeighbour(
          activeSpins,
          wheelType,
          minSpinsRequired,
          neighbourRadius || 8
        );
        break;
      case 'opposite_pocket':
        selectedNumbers = selectByOppositePocket(activeSpins, wheelType, minSpinsRequired);
        break;
      case 'sector':
        selectedNumbers = selectBySector(activeSpins, wheelType, minSpinsRequired);
        break;
      case 'bayesian':
        selectedNumbers = selectByBayesianSmoothing(
          activeSpins,
          wheelType,
          minSpinsRequired,
          priorAlpha || 1.0
        );
        break;
      case 'weighted_ensemble':
        selectedNumbers = selectByWeightedEnsemble(
          activeSpins,
          wheelType,
          ensembleWeights,
          minSpinsRequired
        );
        break;
    }
  }

  // Ensure EXACTLY 18 numbers if sufficient data
  if (isSufficient && selectedNumbers.length !== 18) {
    const allNums = getAllWheelNumbers(wheelType);
    const set = new Set(selectedNumbers);
    allNums.forEach((n) => {
      if (set.size < 18) set.add(n);
    });
    selectedNumbers = Array.from(set).slice(0, 18);
  }

  return {
    id: `snap_${Date.now()}_${method}`,
    timestamp: Date.now(),
    method,
    parameters: config,
    sourceSessionId: sessionId,
    historyCutoff: activeSpins.length,
    selectedNumbers,
    isSufficientData: isSufficient,
    modelVersion: LAB_MODEL_VERSION,
    disclaimer: CANDIDATE_ENGINE_DISCLAIMER,
  };
}

/**
 * Computes candidate snapshots for all 8 experimental methods.
 */
export function computeAllCandidateMethods(
  spins: { number: string }[],
  wheelType: WheelType,
  sessionId: string = 'active_session'
): Record<CandidateMethodId, CandidateSnapshotRecord> {
  const spinStrings = spins.map((s) => s.number);

  const methods: CandidateMethodId[] = [
    'frequency',
    'recency',
    'transition',
    'wheel_neighbour',
    'opposite_pocket',
    'sector',
    'bayesian',
    'weighted_ensemble',
  ];

  const result: Partial<Record<CandidateMethodId, CandidateSnapshotRecord>> = {};

  methods.forEach((method) => {
    result[method] = generateExperimentalCandidates(
      spinStrings,
      {
        method,
        minSpinsRequired: 10,
        historyCutoff: 100,
        wheelType,
      },
      sessionId
    );
  });

  return result as Record<CandidateMethodId, CandidateSnapshotRecord>;
}

