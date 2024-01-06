import { truthy } from './checks';

export const ifIt = (cond, action, defaultTo) => (truthy(cond) ? action() : defaultTo);

const inner =
  (fn) =>
  (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curry(fn)(...args, ...more);

export const curry = <P extends any[], R>(fn: (...args: P) => R) => inner(fn);
