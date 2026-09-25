import {
  CandidateSnapshotRecord,
  EvaluationTargetFilter,
  PayoutFormat,
  PnlConfig,
  PnlEvaluationRecord,
  PnlSnapshotData,
  PnlSummaryStats,
  SpinItem,
  WheelType,
} from '../types/roulette';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
};

export const UNCONFIGURED_PNL_CONFIG: PnlConfig = {
  gameName: '',
  currency: 'INR',
  startingBankroll: undefined,
  payoutFormat: 'total_return',
  payoutValue: undefined,
  stakePerNumber: undefined,
  totalStakeBudget: undefined,
  selectedCoverage: 'all',
  requestedCoverageCount: undefined,
  pnlTrackingEnabled: false,
  isConfigured: false,
};

export const DEFAULT_PNL_CONFIG: PnlConfig = UNCONFIGURED_PNL_CONFIG;

/**
 * Checks if a P&L configuration has been explicitly filled out and saved with valid numbers.
 */
export function isPnlConfigured(config?: PnlConfig | null): boolean {
  if (!config) return false;
  if (config.isConfigured === false) return false;
  if (config.pnlTrackingEnabled === false) return false;
  return (
    typeof config.startingBankroll === 'number' &&
    config.startingBankroll > 0 &&
    typeof config.payoutValue === 'number' &&
    config.payoutValue > 0 &&
    ((typeof config.stakePerNumber === 'number' && config.stakePerNumber > 0) ||
      (typeof config.totalStakeBudget === 'number' && config.totalStakeBudget > 0))
  );
}

/**
 * Returns formatted currency string (e.g. "₹1,200" or "-$500").
 */
export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || `${currencyCode} `;
  const isNegative = amount < 0;
  const absFormatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${symbol}${absFormatted}` : `+${symbol}${absFormatted}`;
}

/**
 * Formats amount without leading '+' symbol for neutral display.
 */
export function formatCurrencyNeutral(amount: number, currencyCode: string = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || `${currencyCode} `;
  const isNegative = amount < 0;
  const absFormatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${symbol}${absFormatted}` : `${symbol}${absFormatted}`;
}

/**
 * Calculates covered result return per winning number.
 * - 'total_return': X * stake (stake included)
 * - 'net_winnings': (X + 1) * stake (net winnings X * stake + winning stake returned)
 */
export function calculateCoveredReturn(
  stakePerNumber: number,
  payoutValue: number,
  format: PayoutFormat = 'total_return'
): number {
  if (stakePerNumber <= 0 || payoutValue <= 0) return 0;
  if (format === 'net_winnings') {
    return stakePerNumber * (payoutValue + 1);
  }
  return stakePerNumber * payoutValue;
}

/**
 * Calculates stake, return, profit, loss for a specific target pocket count N.
 */
export function calculatePnlForCoverage(
  candidatePockets: string[],
  config: PnlConfig,
  requestedCount: number
) {
  const pockets = Array.isArray(candidatePockets) ? candidatePockets : [];
  if (!isPnlConfigured(config)) {
    return {
      requestedCount,
      availableCount: pockets.length,
      numberCount: 0,
      isAvailable: false,
      stakePerNumber: 0,
      totalStake: 0,
      coveredReturn: 0,
      possibleNetProfit: 0,
      possibleNetLoss: 0,
      statusText: 'Not configured',
      coveredNumbers: [],
    };
  }

  const availableCount = pockets.length;
  const isAvailable = availableCount >= requestedCount;
  const actualPockets = pockets.slice(0, requestedCount);

  let stakePerNumber = config.stakePerNumber || 0;
  if (config.totalStakeBudget && config.totalStakeBudget > 0 && requestedCount > 0) {
    stakePerNumber = Math.max(1, Math.floor((config.totalStakeBudget / requestedCount) * 100) / 100);
  }

  const totalStake = requestedCount * stakePerNumber;
  const coveredReturn = calculateCoveredReturn(stakePerNumber, config.payoutValue!, config.payoutFormat);
  const possibleNetProfit = coveredReturn - totalStake;
  const possibleNetLoss = -totalStake;

  return {
    requestedCount,
    availableCount,
    numberCount: actualPockets.length,
    isAvailable,
    stakePerNumber,
    totalStake,
    coveredReturn,
    possibleNetProfit,
    possibleNetLoss,
    statusText: isAvailable ? `Covers ${actualPockets.length} numbers` : 'Insufficient candidate numbers for selected coverage',
    coveredNumbers: actualPockets,
  };
}

/**
 * Computes P&L snapshot calculations for a candidate pocket set and config.
 */
export function computePnlSnapshotData(
  candidatePockets: string[],
  config: PnlConfig,
  wheelType: WheelType = 'European'
): PnlSnapshotData {
  const pockets = Array.isArray(candidatePockets) ? candidatePockets : [];

  if (!isPnlConfigured(config)) {
    return {
      config: { ...config, isConfigured: false },
      coveredNumbers: [],
      coveredCount: 0,
      stakePerNumber: 0,
      totalStake: 0,
      possibleCoveredReturn: 0,
      possibleNetProfit: 0,
      possibleNetLoss: 0,
      isCoverageAvailable: false,
      statusMessage: 'Not configured',
    };
  }

  const isAmerican = typeof wheelType === 'string' && wheelType.toLowerCase() === 'american';
  const maxAllowed = isAmerican ? 38 : 37;

  if (pockets.length === 0) {
    return {
      config: { ...config, isConfigured: true, requestedCoverageCount: 0 },
      coveredNumbers: [],
      coveredCount: 0,
      stakePerNumber: config.stakePerNumber || 0,
      totalStake: 0,
      possibleCoveredReturn: 0,
      possibleNetProfit: 0,
      possibleNetLoss: 0,
      isCoverageAvailable: false,
      statusMessage: 'No candidate numbers available',
    };
  }

  const requestedCount = Math.min(maxAllowed, pockets.length);
  const actualPockets = pockets.slice(0, requestedCount);
  const coveredCount = actualPockets.length;

  let stakePerNumber = config.stakePerNumber || 0;
  if (config.totalStakeBudget && config.totalStakeBudget > 0 && coveredCount > 0) {
    stakePerNumber = Math.max(1, Math.floor((config.totalStakeBudget / coveredCount) * 100) / 100);
  }

  const totalStake = coveredCount * stakePerNumber;
  const possibleCoveredReturn = calculateCoveredReturn(stakePerNumber, config.payoutValue!, config.payoutFormat);
  const possibleNetProfit = possibleCoveredReturn - totalStake;
  const possibleNetLoss = -totalStake;

  const selectedPnl = {
    coverage: config.selectedCoverage,
    numberCount: coveredCount,
    totalStake,
    stakePerNumber,
    coveredReturn: possibleCoveredReturn,
    possibleNetProfit,
    possibleNetLoss,
    isAvailable: true,
  };

  const count18 = calculatePnlForCoverage(pockets, config, 18);
  const count29 = calculatePnlForCoverage(pockets, config, 29);
  const count30 = calculatePnlForCoverage(pockets, config, 30);

  return {
    config: { ...config, isConfigured: true, requestedCoverageCount: coveredCount },
    coveredNumbers: actualPockets,
    coveredCount,
    stakePerNumber,
    totalStake,
    possibleCoveredReturn,
    possibleNetProfit,
    possibleNetLoss,
    isCoverageAvailable: true,
    statusMessage: `Covers ${coveredCount} numbers`,
    selectedPnl,
    table3: {
      count18,
      count29,
      count30,
    },
  };
}

/**
 * Evaluates spin P&L against saved pre-spin snapshot.
 */
export function evaluatePnlForSpin(
  spin: SpinItem,
  spinIndex: number,
  snapshot: CandidateSnapshotRecord | null,
  prevCumulativePnl: number,
  startingBankroll: number
): PnlEvaluationRecord | null {
  if (!snapshot || !snapshot.pnlData || !isPnlConfigured(snapshot.pnlData.config) || snapshot.pnlData.config.pnlTrackingEnabled === false) {
    return null;
  }

  const { pnlData } = snapshot;
  const isCovered = pnlData.coveredNumbers.includes(spin.number) && pnlData.isCoverageAvailable;
  const totalStake = pnlData.totalStake;
  const coveredReturn = isCovered ? pnlData.possibleCoveredReturn : 0;
  const realizedPnl = isCovered ? pnlData.possibleNetProfit : pnlData.possibleNetLoss;

  const cumulativePnl = prevCumulativePnl + realizedPnl;
  const bankrollBase = snapshot.pnlData.config.startingBankroll || startingBankroll || 0;
  const currentBankroll = bankrollBase + cumulativePnl;

  return {
    spinId: spin.id,
    spinNumber: spin.number,
    spinIndex,
    isCovered,
    coveredReturn,
    totalStake,
    stakePerNumber: pnlData.stakePerNumber,
    payoutValue: pnlData.config.payoutValue || 0,
    realizedPnl,
    cumulativePnl,
    currentBankroll,
    snapshotVersion: snapshot.version,
    currency: pnlData.config.currency,
  };
}

/**
 * Computes P&L summary statistics across evaluated records.
 */
export function computePnlSummaryStats(
  evaluations: PnlEvaluationRecord[],
  config: PnlConfig
): PnlSummaryStats {
  const configured = isPnlConfigured(config);
  const startingBankroll = configured ? config.startingBankroll! : 0;

  if (evaluations.length === 0) {
    return {
      latestRealizedPnl: null,
      cumulativePnl: 0,
      currentBankroll: startingBankroll,
      startingBankroll,
      totalPnlSpins: 0,
      totalEvaluatedSpins: 0,
      totalWinningSpins: 0,
      totalLosingSpins: 0,
      currency: config.currency || 'INR',
      isConfigured: configured,
    };
  }

  const latest = evaluations[evaluations.length - 1];
  const totalPnlSpins = evaluations.length;
  const totalWinningSpins = evaluations.filter((e) => e.isCovered).length;
  const totalLosingSpins = totalPnlSpins - totalWinningSpins;
  const cumulativePnl = latest.cumulativePnl;
  const currentBankroll = latest.currentBankroll;

  return {
    latestRealizedPnl: latest.realizedPnl,
    cumulativePnl,
    currentBankroll,
    startingBankroll,
    totalPnlSpins,
    totalEvaluatedSpins: totalPnlSpins,
    totalWinningSpins,
    totalLosingSpins,
    currency: config.currency || 'INR',
    isConfigured: configured,
  };
}

