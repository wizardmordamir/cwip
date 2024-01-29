import { truthy } from './types';

export const ifIt = (cond, action, defaultTo) => (truthy(cond) ? action() : defaultTo);

const inner =
  (fn) =>
  (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curry(fn)(...args, ...more);

// note fn.length changes when there are rest or default params
export const curry = <P extends any[], R>(fn: (...args: P) => R) => inner(fn);
