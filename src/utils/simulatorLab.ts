import { WheelType } from '../types/roulette';
import { ZeroRule } from './categoryLab';
import { getPocketColor, getWheelSequence } from './rouletteRules';

export type BettingSystemId =
  | 'flat'
  | 'martingale'
  | 'reverse_martingale'
  | 'fibonacci'
  | 'dalembert'
  | 'reverse_dalembert'
  | 'labouchere'
  | 'reverse_labouchere'
  | 'oscars_grind'
  | 'system_1326'
  | 'fixed_18_numbers'
  | 'sector_coverage';

export type TargetBetType =
  | 'red_black'
  | 'odd_even'
  | 'high_low'
  | 'dozen'
  | 'column'
  | '18_numbers'
  | 'sector';

export interface SimulationParams {
  systemId: BettingSystemId;
  targetBetType: TargetBetType;
  initialBankroll: number;
  baseUnit: number;
  minBet: number;
  maxBet: number;
  wheelType: WheelType;
  zeroRule: ZeroRule;
  targetCategory?: string; // e.g. 'Red', '1st Dozen'
  customSectorNumbers?: string[]; // for sector coverage
  custom18Numbers?: string[]; // for 18 numbers coverage
  maxSpinsLimit?: number;
}

export interface EquityPoint {
  spinIndex: number;
  spinNumber: string;
  stake: number;
  netOutcome: number;
  bankroll: number;
  drawdown: number;
  drawdownPct: number;
}

export interface SingleSimulationResult {
  params: SimulationParams;
  initialBankroll: number;
  finalBankroll: number;
  netReturn: number;
  roiPercentage: number;
  totalWagered: number;
  totalSpins: number;
  wins: number;
  losses: number;
  pushes: number; // for zero rules refund/prison
  winRate: number;
  peakBankroll: number;
  maxDrawdownAmount: number;
  maxDrawdownPercentage: number;
  bankrollExhausted: boolean;
  exhaustionSpinIndex: number | null;
  equityCurve: EquityPoint[];
}

export interface MonteCarloSummaryResult {
  params: SimulationParams;
  numSimulations: number;
  spinsPerSimulation: number;
  bankruptcyRate: number; // % of runs that hit $0
  averageFinalBankroll: number;
  medianFinalBankroll: number;
  averageNetReturn: number;
  averageMaxDrawdownPct: number;
  bestFinalBankroll: number;
  worstFinalBankroll: number;
  sampleEquityCurves: EquityPoint[][];
}

const FIBONACCI_SEQ = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/**
 * Checks if a spin number hits the chosen target bet
 */
export function evaluateBetHit(
  spinNumber: string,
  targetBetType: TargetBetType,
  targetCategory: string = 'Red',
  customNumbers: string[] = []
): { isWin: boolean; isZero: boolean; payoutMultiplier: number } {
  const isZero = spinNumber === '0' || spinNumber === '00';

  if (targetBetType === '18_numbers') {
    const isHit = customNumbers.includes(spinNumber);
    // Payout multiplier for single number is 35:1
    return { isWin: isHit, isZero, payoutMultiplier: 35 };
  }

  if (targetBetType === 'sector') {
    const isHit = customNumbers.includes(spinNumber);
    return { isWin: isHit, isZero, payoutMultiplier: 35 };
  }

  if (isZero) {
    return { isWin: false, isZero: true, payoutMultiplier: 0 };
  }

  if (targetBetType === 'red_black') {
    const color = getPocketColor(spinNumber);
    const isHit = (targetCategory === 'Red' && color === 'red') || (targetCategory === 'Black' && color === 'black');
    return { isWin: isHit, isZero: false, payoutMultiplier: 1 };
  }

  if (targetBetType === 'odd_even') {
    const n = parseInt(spinNumber, 10);
    const isOdd = n % 2 === 1;
    const isHit = (targetCategory === 'Odd' && isOdd) || (targetCategory === 'Even' && !isOdd);
    return { isWin: isHit, isZero: false, payoutMultiplier: 1 };
  }

  if (targetBetType === 'high_low') {
    const n = parseInt(spinNumber, 10);
    const isHigh = n >= 19 && n <= 36;
    const isHit = (targetCategory === 'High' && isHigh) || (targetCategory === 'Low' && !isHigh);
    return { isWin: isHit, isZero: false, payoutMultiplier: 1 };
  }

  if (targetBetType === 'dozen') {
    const n = parseInt(spinNumber, 10);
    const d1 = n >= 1 && n <= 12;
    const d2 = n >= 13 && n <= 24;
    const d3 = n >= 25 && n <= 36;
    const isHit =
      (targetCategory === '1st' && d1) ||
      (targetCategory === '2nd' && d2) ||
      (targetCategory === '3rd' && d3);
    return { isWin: isHit, isZero: false, payoutMultiplier: 2 };
  }

  if (targetBetType === 'column') {
    const n = parseInt(spinNumber, 10);
    const c1 = n % 3 === 1;
    const c2 = n % 3 === 2;
    const c3 = n % 3 === 0;
    const isHit =
      (targetCategory === '1st' && c1) ||
      (targetCategory === '2nd' && c2) ||
      (targetCategory === '3rd' && c3);
    return { isWin: isHit, isZero: false, payoutMultiplier: 2 };
  }

  return { isWin: false, isZero: false, payoutMultiplier: 0 };
}

/**
 * Runs a single simulation over a given spin sequence
 */
export function runSingleSimulation(
  spins: string[],
  params: SimulationParams
): SingleSimulationResult {
  const {
    systemId,
    targetBetType,
    initialBankroll,
    baseUnit,
    minBet,
    maxBet,
    zeroRule,
    targetCategory = 'Red',
    customSectorNumbers = [],
    custom18Numbers = [],
    maxSpinsLimit = spins.length,
  } = params;

  let bankroll = initialBankroll;
  let peakBankroll = initialBankroll;
  let maxDrawdownAmt = 0;
  let maxDrawdownPct = 0;
  let totalWagered = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  let bankrollExhausted = false;
  let exhaustionIndex: number | null = null;

  const equityCurve: EquityPoint[] = [
    {
      spinIndex: 0,
      spinNumber: 'START',
      stake: 0,
      netOutcome: 0,
      bankroll: initialBankroll,
      drawdown: 0,
      drawdownPct: 0,
    },
  ];

  // System state variables
  let martingaleMultiplier = 1;
  let paroliStreak = 0;
  let fiboIdx = 0;
  let dalembertUnits = 1;
  let reverseDalembertUnits = 1;
  let labouchereLine = [1, 2, 3, 4];
  let reverseLabouchereLine = [1, 2, 3, 4];
  let oscarCycleProfit = 0;
  let oscarCurrentBetUnits = 1;
  let system1326Index = 0;
  const seq1326 = [1, 3, 2, 6];

  let wasInPrison = false;

  const spinsToRun = spins.slice(0, maxSpinsLimit);

  for (let i = 0; i < spinsToRun.length; i++) {
    if (bankroll <= 0) {
      if (!bankrollExhausted) {
        bankrollExhausted = true;
        exhaustionIndex = i;
      }
      break;
    }

    const spinNum = spinsToRun[i];

    // Determine stake (in base units or total $)
    let betUnits = 1;

    if (systemId === 'flat') {
      betUnits = 1;
    } else if (systemId === 'martingale') {
      betUnits = martingaleMultiplier;
    } else if (systemId === 'reverse_martingale') {
      betUnits = Math.pow(2, paroliStreak);
    } else if (systemId === 'fibonacci') {
      betUnits = FIBONACCI_SEQ[Math.min(fiboIdx, FIBONACCI_SEQ.length - 1)];
    } else if (systemId === 'dalembert') {
      betUnits = dalembertUnits;
    } else if (systemId === 'reverse_dalembert') {
      betUnits = reverseDalembertUnits;
    } else if (systemId === 'labouchere') {
      if (labouchereLine.length === 0) labouchereLine = [1, 2, 3, 4];
      betUnits =
        labouchereLine.length === 1
          ? labouchereLine[0]
          : labouchereLine[0] + labouchereLine[labouchereLine.length - 1];
    } else if (systemId === 'reverse_labouchere') {
      if (reverseLabouchereLine.length === 0) reverseLabouchereLine = [1, 2, 3, 4];
      betUnits =
        reverseLabouchereLine.length === 1
          ? reverseLabouchereLine[0]
          : reverseLabouchereLine[0] + reverseLabouchereLine[reverseLabouchereLine.length - 1];
    } else if (systemId === 'oscars_grind') {
      betUnits = oscarCurrentBetUnits;
    } else if (systemId === 'system_1326') {
      betUnits = seq1326[system1326Index];
    } else if (systemId === 'fixed_18_numbers') {
      betUnits = 18; // 1 unit on each of 18 numbers
    } else if (systemId === 'sector_coverage') {
      betUnits = customSectorNumbers.length || 12; // 1 unit on each sector pocket
    }

    // Calculate total stake dollars
    let rawStake = betUnits * baseUnit;
    let actualStake = Math.max(minBet, Math.min(maxBet, rawStake));
    if (actualStake > bankroll) {
      actualStake = bankroll; // cap at remaining bankroll
    }

    totalWagered += actualStake;

    // Evaluate hit
    const evalHit = evaluateBetHit(spinNum, targetBetType, targetCategory, targetBetType === '18_numbers' ? custom18Numbers : customSectorNumbers);

    let netOutcome = 0;

    // Multi-number coverage payout calculation
    if (targetBetType === '18_numbers' || targetBetType === 'sector') {
      const numPocketsCovered = targetBetType === '18_numbers' ? (custom18Numbers.length || 18) : (customSectorNumbers.length || 12);
      const stakePerNumber = actualStake / numPocketsCovered;

      if (evalHit.isWin) {
        // Single hit pays 35:1 on that pocket, rest 17/k pockets lose stake
        const winPayout = stakePerNumber * 36;
        netOutcome = winPayout - actualStake;
        wins++;
      } else {
        netOutcome = -actualStake;
        losses++;
      }
    } else {
      // 1:1 or 2:1 bets
      if (evalHit.isWin) {
        netOutcome = actualStake * evalHit.payoutMultiplier;
        wins++;
        wasInPrison = false;
      } else if (evalHit.isZero && (targetBetType === 'red_black' || targetBetType === 'odd_even' || targetBetType === 'high_low')) {
        // Zero rules application for 1:1 bets
        if (zeroRule === 'la_partage') {
          netOutcome = -0.5 * actualStake; // lose 50%
          pushes++;
        } else if (zeroRule === 'en_prison') {
          if (wasInPrison) {
            netOutcome = -actualStake; // lose full on 2nd zero
            losses++;
            wasInPrison = false;
          } else {
            netOutcome = 0; // bet is held, no bankroll change this spin
            pushes++;
            wasInPrison = true;
          }
        } else {
          netOutcome = -actualStake;
          losses++;
        }
      } else {
        netOutcome = -actualStake;
        losses++;
        wasInPrison = false;
      }
    }

    bankroll += netOutcome;
    peakBankroll = Math.max(peakBankroll, bankroll);

    const currentDrawdown = peakBankroll - bankroll;
    const currentDrawdownPct = peakBankroll > 0 ? (currentDrawdown / peakBankroll) * 100 : 0;
    maxDrawdownAmt = Math.max(maxDrawdownAmt, currentDrawdown);
    maxDrawdownPct = Math.max(maxDrawdownPct, currentDrawdownPct);

    // Update Staking Progression States based on outcome
    const isSpinWin = netOutcome > 0;

    if (systemId === 'martingale') {
      if (isSpinWin) martingaleMultiplier = 1;
      else martingaleMultiplier *= 2;
    } else if (systemId === 'reverse_martingale') {
      if (isSpinWin) {
        paroliStreak++;
        if (paroliStreak >= 3) paroliStreak = 0; // reset on target 3 streak
      } else {
        paroliStreak = 0;
      }
    } else if (systemId === 'fibonacci') {
      if (isSpinWin) fiboIdx = Math.max(0, fiboIdx - 2);
      else fiboIdx++;
    } else if (systemId === 'dalembert') {
      if (isSpinWin) dalembertUnits = Math.max(1, dalembertUnits - 1);
      else dalembertUnits++;
    } else if (systemId === 'reverse_dalembert') {
      if (isSpinWin) reverseDalembertUnits++;
      else reverseDalembertUnits = Math.max(1, reverseDalembertUnits - 1);
    } else if (systemId === 'labouchere') {
      const uStake = Math.round(actualStake / baseUnit);
      if (isSpinWin) {
        labouchereLine.shift();
        labouchereLine.pop();
        if (labouchereLine.length === 0) labouchereLine = [1, 2, 3, 4];
      } else {
        labouchereLine.push(uStake);
      }
    } else if (systemId === 'reverse_labouchere') {
      const uProfit = Math.round(netOutcome / baseUnit);
      if (isSpinWin) {
        reverseLabouchereLine.push(uProfit);
      } else {
        reverseLabouchereLine.shift();
        reverseLabouchereLine.pop();
        if (reverseLabouchereLine.length === 0) reverseLabouchereLine = [1, 2, 3, 4];
      }
    } else if (systemId === 'oscars_grind') {
      const uProfit = Math.round(netOutcome / baseUnit);
      oscarCycleProfit += uProfit;
      if (oscarCycleProfit >= 1) {
        // Target achieved! Reset cycle
        oscarCycleProfit = 0;
        oscarCurrentBetUnits = 1;
      } else if (isSpinWin) {
        oscarCurrentBetUnits++;
      }
    } else if (systemId === 'system_1326') {
      if (isSpinWin) {
        system1326Index++;
        if (system1326Index >= seq1326.length) system1326Index = 0;
      } else {
        system1326Index = 0;
      }
    }

    equityCurve.push({
      spinIndex: i + 1,
      spinNumber: spinNum,
      stake: actualStake,
      netOutcome,
      bankroll,
      drawdown: currentDrawdown,
      drawdownPct: currentDrawdownPct,
    });
  }

  const netReturn = bankroll - initialBankroll;
  const roiPercentage = totalWagered > 0 ? (netReturn / totalWagered) * 100 : 0;
  const totalSpinsRun = equityCurve.length - 1;
  const winRate = totalSpinsRun > 0 ? (wins / totalSpinsRun) * 100 : 0;

  return {
    params,
    initialBankroll,
    finalBankroll: bankroll,
    netReturn,
    roiPercentage,
    totalWagered,
    totalSpins: totalSpinsRun,
    wins,
    losses,
    pushes,
    winRate,
    peakBankroll,
    maxDrawdownAmount: maxDrawdownAmt,
    maxDrawdownPercentage: maxDrawdownPct,
    bankrollExhausted,
    exhaustionSpinIndex: exhaustionIndex,
    equityCurve,
  };
}

/**
 * Runs Monte Carlo baseline synthetic simulations
 */
export function runMonteCarloSimulations(
  params: SimulationParams,
  numSimulations: number = 100,
  spinsPerSimulation: number = 100
): MonteCarloSummaryResult {
  const seq = getWheelSequence(params.wheelType);
  const K = seq.length;

  const results: SingleSimulationResult[] = [];
  let bankruptedCount = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    // Generate synthetic fair roulette spin sequence
    const syntheticSpins: string[] = [];
    for (let s = 0; s < spinsPerSimulation; s++) {
      const randIdx = Math.floor(Math.random() * K);
      syntheticSpins.push(seq[randIdx]);
    }

    const simRes = runSingleSimulation(syntheticSpins, params);
    results.push(simRes);
    if (simRes.bankrollExhausted) {
      bankruptedCount++;
    }
  }

  const finalBankrolls = results.map((r) => r.finalBankroll).sort((a, b) => a - b);
  const avgFinal = finalBankrolls.reduce((a, b) => a + b, 0) / numSimulations;
  const medianFinal =
    numSimulations % 2 === 0
      ? (finalBankrolls[numSimulations / 2 - 1] + finalBankrolls[numSimulations / 2]) / 2
      : finalBankrolls[Math.floor(numSimulations / 2)];

  const avgNet = results.reduce((a, b) => a + b.netReturn, 0) / numSimulations;
  const avgDrawdownPct = results.reduce((a, b) => a + b.maxDrawdownPercentage, 0) / numSimulations;

  return {
    params,
    numSimulations,
    spinsPerSimulation,
    bankruptcyRate: (bankruptedCount / numSimulations) * 100,
    averageFinalBankroll: avgFinal,
    medianFinalBankroll: medianFinal,
    averageNetReturn: avgNet,
    averageMaxDrawdownPct: avgDrawdownPct,
    bestFinalBankroll: finalBankrolls[numSimulations - 1],
    worstFinalBankroll: finalBankrolls[0],
    sampleEquityCurves: results.slice(0, 5).map((r) => r.equityCurve),
  };
}
