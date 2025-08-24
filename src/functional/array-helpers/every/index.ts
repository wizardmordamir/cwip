/* eslint-disable */
import { curry } from '../..';

export const every = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) =>
  array.every(fn),
);
