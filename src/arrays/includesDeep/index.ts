import { getDeepKey } from '../../objects';

export const includesDeep = <T, V>(
  arr: T[],
  vals: V[],
  deepKey?: string,
  separator: string = '.',
): V[] => {
  const set = new Set(arr.map((a) => (deepKey ? getDeepKey(a, deepKey, separator) : a)));
  return vals.filter((val) => set.has(deepKey ? val : (val as unknown as T)));
};
