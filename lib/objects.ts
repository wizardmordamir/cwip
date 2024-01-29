import { existy } from './types';
import { excludes } from './arrays';

export const shallowClone = (obj) => Object.assign({}, obj);
export const deepClone = (obj) => structuredClone(obj);
export const extend = (...objects) => Object.assign({}, ...objects);

export const excludesKeys = <T>(obj: T, keys: string[]): string[] =>
  excludes(Object.keys(obj), keys);

// safely stringify with circular references
export const stringify = function stringify(o, spaces = 2) {
  const cache = [];
  return JSON.stringify(
    o,
    function (k, v) {
      if (typeof v === 'object' && v !== null) {
        if (cache.indexOf(v) !== -1) return;
        cache.push(v);
      }
      return v;
    },
    spaces,
  );
};

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 'b'
export const firstExistingProp = (obj, ...props) => {
  if (Array.isArray(props[0])) {
    props = props[0];
  }
  for (let i = 0; i < props.length; i++) {
    if (existy(obj[props[i]])) {
      return props[i];
    }
  }
};

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 2
export const firstExistingPropValue = (obj, ...props) => {
  if (Array.isArray(props[0])) {
    props = props[0];
  }
  for (let i = 0; i < props.length; i++) {
    if (existy(obj[props[i]])) {
      return obj[props[i]];
    }
  }
};
