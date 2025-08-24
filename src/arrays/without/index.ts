import { getDeepKey } from '../../objects';

export const without = <T>(arr: T[], vals: T[], deepKey?: string, separator: string = '.'): T[] => {
  const valsSet = new Set(vals);
  return arr.filter((item) =>
    deepKey ? !valsSet.has(getDeepKey(item, deepKey, separator)) : !valsSet.has(item),
  );
};
