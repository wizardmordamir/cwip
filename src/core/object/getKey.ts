import { curry } from '../flow';

export const getKey = curry((key: string, obj: any): any => {
  if (!obj || !key) return undefined;
  if (typeof obj !== 'object') return undefined;
  if (typeof key !== 'string') return undefined;
  return obj[key];
});
