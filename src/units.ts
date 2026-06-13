import type { SizeUnit } from './types';

export const PT_PER_IN = 72;
export const MM_PER_IN = 25.4;

export const inToPt = (inches: number) => inches * PT_PER_IN;
export const ptToIn = (pt: number) => pt / PT_PER_IN;

/** Convert a font size stored in points into the unit shown in the UI. */
export function ptToUnit(pt: number, unit: SizeUnit): number {
  switch (unit) {
    case 'pt':
      return pt;
    case 'in':
      return pt / PT_PER_IN;
    case 'mm':
      return (pt / PT_PER_IN) * MM_PER_IN;
  }
}

/** Convert a UI value (in the given unit) back into points for storage. */
export function unitToPt(value: number, unit: SizeUnit): number {
  switch (unit) {
    case 'pt':
      return value;
    case 'in':
      return value * PT_PER_IN;
    case 'mm':
      return (value / MM_PER_IN) * PT_PER_IN;
  }
}

/** Reasonable step size for the size spinner in each unit. */
export function sizeStep(unit: SizeUnit): number {
  switch (unit) {
    case 'pt':
      return 1;
    case 'in':
      return 0.05;
    case 'mm':
      return 1;
  }
}

export function round(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}
