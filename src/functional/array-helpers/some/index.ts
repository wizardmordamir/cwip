/* eslint-disable */
import { curry } from '../..';

export const some = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) =>
  array.some(fn),
);
