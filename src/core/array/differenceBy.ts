import { curry } from '../flow';
import { path } from '../object';

type DifferenceBy = {
  <T, V>(deepKey: string): (arrToCompare: T[]) => (vals: V[]) => V[];
  <T, V>(deepKey: string, arrToCompare: T[]): (vals: V[]) => V[];
  <T, V>(deepKey: string, arrToCompare: T[], vals: V[]): V[];
};

export const differenceBy = curry((deepKey: string = '', arrToCompare: any[], vals: any[]) => {
  const extractedValues =
    deepKey && deepKey.trim() !== '' ? arrToCompare.map((item) => path(deepKey, item)) : arrToCompare;

  const compareSet = new Set(extractedValues);
  return vals.filter((val) => !compareSet.has(val));
}, 3) as unknown as DifferenceBy;

// differenceBy('') monomorphizes its generics to unknown at this call site, so
// re-assert the shape. The generic lives on the OUTER call so it's inferred from
// arrToCompare and flows into the returned function (both arrays share the type).
export const difference = differenceBy('') as <T>(arrToCompare: T[]) => (vals: T[]) => T[];
