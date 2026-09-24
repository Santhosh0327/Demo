import { describe, it, expect } from 'vitest';
import {
  EUROPEAN_WHEEL_SEQUENCE,
  AMERICAN_WHEEL_SEQUENCE,
  getPocketColor,
  getDozen,
  getColumn,
  getParity,
  getRange,
  getOppositePockets,
} from '../utils/rouletteRules';

describe('Roulette Wheel Rules & Category Exclusions', () => {
  it('has correct pocket counts for European (37) and American (38) wheels', () => {
    expect(EUROPEAN_WHEEL_SEQUENCE.length).toBe(37);
    expect(AMERICAN_WHEEL_SEQUENCE.length).toBe(38);
    expect(EUROPEAN_WHEEL_SEQUENCE).toContain('0');
    expect(AMERICAN_WHEEL_SEQUENCE).toContain('00');
  });

  it('correctly assigns green color to 0 and 00', () => {
    expect(getPocketColor('0')).toBe('green');
    expect(getPocketColor('00')).toBe('green');
    expect(getPocketColor('1')).toBe('red');
    expect(getPocketColor('2')).toBe('black');
  });

  it('strictly excludes zero (0 and 00) from dozens, columns, parity, and range', () => {
    expect(getDozen('0')).toBeNull();
    expect(getDozen('00')).toBeNull();

    expect(getColumn('0')).toBeNull();
    expect(getColumn('00')).toBeNull();

    expect(getParity('0')).toBeNull();
    expect(getParity('00')).toBeNull();

    expect(getRange('0')).toBeNull();
    expect(getRange('00')).toBeNull();
  });

  it('correctly assigns non-zero numbers to Dozens and Columns', () => {
    expect(getDozen('5')).toBe('1st');
    expect(getDozen('18')).toBe('2nd');
    expect(getDozen('33')).toBe('3rd');

    expect(getColumn('1')).toBe('1st');
    expect(getColumn('2')).toBe('2nd');
    expect(getColumn('3')).toBe('3rd');
  });

  it('correctly calculates European physical opposite pockets (Offsets 18 and 19)', () => {
    const opps = getOppositePockets('0', 'European');
    expect(opps.length).toBe(2);
    expect(opps).toEqual(['10', '5']);
  });

  it('correctly calculates American physical opposite pocket (Offset 19)', () => {
    const opps = getOppositePockets('0', 'American');
    expect(opps.length).toBe(1);
    expect(opps).toEqual(['00']);
  });
});
