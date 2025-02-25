import { curry } from '../../functional';
import { Obj } from '../../ts-types';

export const objHasKey = curry((obj: Obj, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key),
);
