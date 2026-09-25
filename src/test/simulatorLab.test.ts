import { describe, expect, it } from 'vitest';
import {
  BettingSystemId,
  runMonteCarloSimulations,
  runSingleSimulation,
  SimulationParams,
} from '../utils/simulatorLab';

describe('SimulatorLab Virtual Betting System Simulator Tests', () => {
  const spins = [
    '1', '3', '5', '7', '9', '12', '14', '16', '18', '19',
    '21', '23', '25', '27', '30', '32', '34', '36', '2', '4',
  ];

  const baseParams: SimulationParams = {
    systemId: 'flat',
    targetBetType: 'red_black',
    initialBankroll: 1000,
    baseUnit: 10,
    minBet: 1,
    maxBet: 500,
    wheelType: 'European',
    zeroRule: 'standard',
    targetCategory: 'Red',
  };

  it('runs Flat betting strategy correctly', () => {
    const res = runSingleSimulation(spins, baseParams);
    expect(res.totalSpins).toBe(spins.length);
    expect(res.equityCurve.length).toBe(spins.length + 1);
    expect(res.finalBankroll).toBeGreaterThan(0);
  });

  it('runs Martingale strategy and tracks drawdowns', () => {
    const martingaleParams: SimulationParams = {
      ...baseParams,
      systemId: 'martingale',
    };
    const res = runSingleSimulation(spins, martingaleParams);
    expect(res.totalWagered).toBeGreaterThan(0);
    expect(res.maxDrawdownAmount).toBeGreaterThanOrEqual(0);
  });

  it('tests all 12 betting strategies without crashing', () => {
    const systems: BettingSystemId[] = [
      'flat',
      'martingale',
      'reverse_martingale',
      'fibonacci',
      'dalembert',
      'reverse_dalembert',
      'labouchere',
      'reverse_labouchere',
      'oscars_grind',
      'system_1326',
      'fixed_18_numbers',
      'sector_coverage',
    ];

    systems.forEach((systemId) => {
      const p: SimulationParams = {
        ...baseParams,
        systemId,
        targetBetType: systemId === 'fixed_18_numbers' ? '18_numbers' : systemId === 'sector_coverage' ? 'sector' : 'red_black',
        custom18Numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
        customSectorNumbers: ['22', '18', '29', '7', '28', '12', '35', '3', '26', '0', '32', '15'],
      };
      const res = runSingleSimulation(spins, p);
      expect(res.totalSpins).toBeGreaterThan(0);
    });
  });

  it('runs Monte Carlo baseline simulation', () => {
    const mcRes = runMonteCarloSimulations(baseParams, 20, 30);
    expect(mcRes.numSimulations).toBe(20);
    expect(mcRes.spinsPerSimulation).toBe(30);
    expect(mcRes.bankruptcyRate).toBeGreaterThanOrEqual(0);
  });
});
