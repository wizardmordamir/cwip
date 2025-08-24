/* eslint-disable */
import { curry } from '../..';

export const filter = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) =>
  array.filter(fn),
);
