/* eslint-disable */
import { curry } from '../..';

export const find = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) =>
  array.find(fn),
);
