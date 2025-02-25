import { hasKey } from '..';
import { Obj } from '../../ts-types';

export const getMissingKeys = (keys: string[], obj: Obj): string[] =>
  keys.filter((key) => !hasKey(key, obj));
