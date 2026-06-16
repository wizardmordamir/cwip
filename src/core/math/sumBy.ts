import { type Curried, curry } from '../flow';
import { path } from '../object';
import { add } from './math';

// We define the base signature for accurate generics
type SumByBase = <T>(deepKey: string, arr: T[]) => number;

export const sumBy = curry((deepKey: string, arr: any[]): number => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;

  return arr.reduce((total, item) => {
    const val = deepKey ? path(deepKey, item) : item;
    // Ensure we are adding numbers; default to 0 for missing/invalid paths
    const num = typeof val === 'number' ? val : Number(val) || 0;

    return add(num, total);
  }, 0);
}, 2) as Curried<Parameters<SumByBase>, number>;
