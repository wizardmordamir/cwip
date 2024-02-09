import { existy } from './types';
import { excludes } from './arrays';

type Obj = {
  [key: string]: any;
};

export const shallowClone = (obj: Obj): Obj => Object.assign({}, obj);
export const deepClone = (obj: Obj): Obj => structuredClone(obj);
export const extend = (...objects: Obj[]): Object => Object.assign({}, ...objects);

export const excludesKeys = (keys: string[], obj: Obj): string[] =>
  excludes(Object.keys(obj), keys);

// safely stringify with circular references
export const stringify = (obj: Obj, spaces = 2): string => {
  const cache = [];
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

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 'b'
export const firstExistingKey = (keys: string[], obj: Obj): string => {
  for (let i = 0; i < keys.length; i++) {
    if (existy(obj[keys[i]])) {
      return keys[i];
    }
  }
};

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 2
export const firstExistingKeyValue = (keys: string[], obj: Obj): any => {
  for (let i = 0; i < keys.length; i++) {
    if (existy(obj[keys[i]])) {
      return obj[keys[i]];
    }
  }
};

export const hasKey = (key: string, obj: Obj): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

export const hasAllKeys = (keys: string[], obj: Obj): boolean => {
  for (let i = 0; i < keys.length; i++) {
    if (!hasKey(keys[i], obj)) {
      return false;
    }
  }
  return true;
};

export const getMissingKeys = (keys: string[], obj: Obj): string[] =>
  keys.filter((key) => !hasKey(key, obj));

export const removeKeys = (keys: string[], obj: Obj): Obj => {
  for (let i = 0; i < keys.length; i++) {
    delete obj[keys[i]];
  }
  return obj;
};
