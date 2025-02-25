import { excludes } from '../../arrays';
import { Obj } from '../../ts-types';

export const excludesKeys = (keys: string[], obj: Obj): string[] =>
  excludes(Object.keys(obj), keys);
