import { Obj } from '../../ts-types';

export const hasKey = (key: string, obj: Obj): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);
