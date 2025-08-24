/* eslint-disable */
import { Curry } from '../../typescriptUtils';

const inner =
  (fn) =>
  (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curry(fn)(...args, ...more);

export const curry = <P extends any[], R>(fn: (...args: P) => R): Curry<P, R> => inner(fn);
