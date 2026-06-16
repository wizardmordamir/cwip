import { path } from '../object';

type RecursiveFn = (...args: any[]) => any | RecursiveFn;

export const callWithKeys =
  <R>(...keys: string[]) =>
  (curriedFn: RecursiveFn) =>
  (v: any): R => {
    const values = keys.map((key) => path(key, v));

    // We cast to 'any' during the reduce because the intermediate
    // states of a curried function are functionally "un-typable"
    // without knowing the exact length of 'keys' vs 'T'.
    return values.reduce((fn: any, value: any) => {
      if (typeof fn !== 'function') return fn;
      return fn(value);
    }, curriedFn);
  };
