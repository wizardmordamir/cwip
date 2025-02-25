import { getDeepKey } from '../../objects';

export const excludes = <T, V>(
  arr: T[],
  vals: V[],
  deepKey?: string,
  separator: string = '.',
): V[] => {
  const arrSet = deepKey
    ? new Set(arr.map((a) => getDeepKey(a, deepKey, separator)))
    : new Set(arr);
  return vals.filter((val) => !arrSet.has(deepKey ? val : (val as unknown as T)));
};
