import { Obj } from '../../ts-types';
import { existy } from '../../js-types';

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 'b'
export const firstExistingKey = (
  keys: (string | number)[],
  obj: Obj,
): string | number | undefined => {
  for (let i = 0; i < keys.length; i++) {
    if (existy(obj[keys[i]])) {
      return keys[i];
    }
  }
};
