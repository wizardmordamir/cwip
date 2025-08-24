import { curry } from '../../functional';
import { Obj } from '../../ts-types';

export const hasKey = curry((key: string, obj: Obj): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key),
);
