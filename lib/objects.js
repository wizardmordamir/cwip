import { existy } from './checks';

export const shallowClone = (obj) => Object.assign({}, obj);

export const deepClone = (obj) => structuredClone(obj);

export const extend = (...objects) => Object.assign({}, ...objects);

// safely stringify with circular references
export const stringify = function stringify(o) {
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
    4,
  );
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
