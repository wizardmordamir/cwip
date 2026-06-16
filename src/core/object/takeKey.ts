import { path } from '../object';

export const takeKey = <T extends object, R = any>(key: string): ((obj: T) => R) => {
  return path(key as any) as unknown as (obj: T) => R;
};
