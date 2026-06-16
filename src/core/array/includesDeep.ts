import { curry } from '../flow';
import { type Path, path } from '../object';

interface IncludesDeep {
  // 3 args, valid literal key into the source element: autocomplete + typo-safety
  <T extends object, V, P extends Path<T>>(deepKey: P, vals: V[], arr: T[]): V[];

  // 3 args (dynamic key): includesDeep('id', [1, 2], users)
  <T, V>(deepKey: string, vals: V[], arr: T[]): V[];

  // 2 args: includesDeep('id', [1, 2]) -> (arr) => V[]
  <V>(deepKey: string, vals: V[]): <T>(arr: T[]) => V[];

  // 1 arg: includesDeep('id') -> (vals) => (arr) => V[]
  (
    deepKey: string,
  ): {
    <T, V>(vals: V[], arr: T[]): V[];
    <V>(vals: V[]): <T>(arr: T[]) => V[];
  };
}

export const includesDeep = curry(((deepKey: string, vals: any[], arr: any[]): any[] => {
  if (!Array.isArray(arr) || !Array.isArray(vals) || arr.length === 0 || vals.length === 0) {
    return [];
  }

  // Use the logic: extracted values from source array
  const lookupValues = deepKey && deepKey.trim() !== '' ? arr.map((item) => path(deepKey, item)) : arr;

  const set = new Set(lookupValues);

  // Return values that ARE found in the set
  return vals.filter((val) => set.has(val));
}) as any) as unknown as IncludesDeep;
