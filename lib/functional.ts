/* eslint-disable */
import { truthy } from './js-types';

export const ifIt = (cond, action, val) => (truthy(cond) ? action(val) : val);

const inner =
  (fn) =>
  (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curry(fn)(...args, ...more);

// note fn.length changes when there are rest or default params
export const curry = <P extends any[], R>(fn: (..._args: P) => R) => inner(fn);
