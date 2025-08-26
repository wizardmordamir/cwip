export const getDeepKey = (obj: any, deepKey: string, separator: string = '.'): any => {
  if (!obj || !deepKey) return undefined;
  if (typeof obj !== 'object') return undefined;
  if (typeof deepKey !== 'string') return undefined;
  if (!deepKey.includes(separator)) return obj[deepKey];
  return deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
};
