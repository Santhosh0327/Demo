import { PocketColor, WheelType } from '../types/roulette';

export const EUROPEAN_WHEEL_SEQUENCE: string[] = [
  '0', '32', '15', '19', '4', '21', '2', '25', '17', '34', '6', '27',
  '13', '36', '11', '30', '8', '23', '10', '5', '24', '16', '33', '1',
  '20', '14', '31', '9', '22', '18', '29', '7', '28', '12', '35', '3', '26'
];

export const AMERICAN_WHEEL_SEQUENCE: string[] = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22',
  '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29',
  '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35',
  '14', '2'
];

export const RED_NUMBERS = new Set([
  '1', '3', '5', '7', '9', '12', '14', '16', '18', '19', '21', '23', '25', '27', '30', '32', '34', '36'
]);

export const BLACK_NUMBERS = new Set([
  '2', '4', '6', '8', '10', '11', '13', '15', '17', '20', '22', '24', '26', '28', '29', '31', '33', '35'
]);

export function getPocketColor(numStr: string): PocketColor {
  if (numStr === '0' || numStr === '00') return 'green';
  if (RED_NUMBERS.has(numStr)) return 'red';
  if (BLACK_NUMBERS.has(numStr)) return 'black';
  return 'green';
}

export function getAllWheelNumbers(wheelType: WheelType): string[] {
  return wheelType === 'European' ? EUROPEAN_WHEEL_SEQUENCE : AMERICAN_WHEEL_SEQUENCE;
}

export function getWheelSequence(wheelType: WheelType): string[] {
  return wheelType === 'European' ? EUROPEAN_WHEEL_SEQUENCE : AMERICAN_WHEEL_SEQUENCE;
}

export function getDozen(numStr: string): '1st' | '2nd' | '3rd' | null {
  const n = parseInt(numStr, 10);
  if (isNaN(n) || numStr === '0' || numStr === '00') return null;
  if (n >= 1 && n <= 12) return '1st';
  if (n >= 13 && n <= 24) return '2nd';
  if (n >= 25 && n <= 36) return '3rd';
  return null;
}

export function getColumn(numStr: string): '1st' | '2nd' | '3rd' | null {
  const n = parseInt(numStr, 10);
  if (isNaN(n) || numStr === '0' || numStr === '00') return null;
  if (n % 3 === 1) return '1st';
  if (n % 3 === 2) return '2nd';
  if (n % 3 === 0) return '3rd';
  return null;
}

export function getParity(numStr: string): 'Odd' | 'Even' | null {
  const n = parseInt(numStr, 10);
  if (isNaN(n) || numStr === '0' || numStr === '00') return null;
  return n % 2 === 1 ? 'Odd' : 'Even';
}

export function getRange(numStr: string): 'Low' | 'High' | null {
  const n = parseInt(numStr, 10);
  if (isNaN(n) || numStr === '0' || numStr === '00') return null;
  if (n >= 1 && n <= 18) return 'Low';
  if (n >= 19 && n <= 36) return 'High';
  return null;
}

/**
 * Returns wheel neighbours within radius offset (-radius to +radius)
 */
export function getWheelNeighbours(numStr: string, wheelType: WheelType, radius: number = 2): string[] {
  const seq = getWheelSequence(wheelType);
  const idx = seq.indexOf(numStr);
  if (idx === -1) return [];

  const len = seq.length;
  const neighbours: string[] = [];
  for (let i = -radius; i <= radius; i++) {
    const wrappedIdx = (idx + i + len * 100) % len;
    neighbours.push(seq[wrappedIdx]);
  }
  return neighbours;
}

/**
 * Returns exact physical opposite pockets on the wheel.
 * European: offsets 18 and 19 (because 37 is odd)
 * American: offset 19 (because 38 is even)
 */
export function getOppositePockets(numStr: string, wheelType: WheelType): string[] {
  const seq = getWheelSequence(wheelType);
  const idx = seq.indexOf(numStr);
  if (idx === -1) return [];

  const len = seq.length;
  if (wheelType === 'European') {
    const opp1 = seq[(idx + 18) % len];
    const opp2 = seq[(idx + 19) % len];
    return [opp1, opp2];
  } else {
    const opp = seq[(idx + 19) % len];
    return [opp];
  }
}
