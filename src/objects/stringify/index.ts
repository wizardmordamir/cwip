import { Obj } from '../../ts-types';

// safely stringify with circular references
export const stringify = (obj: Obj, spaces = 2): string => {
  const cache: any[] = [];
  return JSON.stringify(
    obj,
    function (key, val) {
      if (typeof val === 'object' && val !== null) {
        if (cache.indexOf(val) !== -1) {
          return;
        }
        cache.push(val);
      }
      return val;
    },
    spaces,
  );
};
