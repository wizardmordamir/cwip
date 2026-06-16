import { hasKey } from '../object';
import type { Obj } from '../types';

export const hasAllKeys = (keys: string[], obj: Obj): boolean => {
  for (let i = 0; i < keys.length; i++) {
    if (!hasKey(keys[i], obj)) {
      return false;
    }
  }
  return true;
};
