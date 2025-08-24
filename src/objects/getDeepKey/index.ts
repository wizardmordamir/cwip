export const getDeepKey = (obj: any, deepKey: string, separator: string = '.'): any =>
  deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
