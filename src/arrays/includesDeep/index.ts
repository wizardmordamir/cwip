import { getDeepKey } from '../../objects';

export const includesDeep = <T, V>(
  arr: T[],
  vals: V[],
  deepKey?: string,
  separator: string = '.',
): V[] => {
  if (arr?.length === 0 || vals?.length === 0) return [];
  if (!arr?.map) return [];
  if (!vals?.filter) return [];
  const set = new Set(arr.map((a) => (deepKey ? getDeepKey(a, deepKey, separator) : a)));
  return vals.filter((val) => set.has(deepKey ? val : (val as unknown as T)));
};
