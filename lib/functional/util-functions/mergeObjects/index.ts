/* eslint-disable */
import { curry } from '../curry';

type MergeObjectsFnType = <A extends object, B extends object>(objA: A, objB: B) => A & B;
type MergeObjectsFnTypePartiallyApplied = <A extends object>(
  objA: A,
) => <B extends object>(objB: B) => A & B;

export const mergeObjects = curry((objA, objB) => ({ ...objA, ...objB })) as MergeObjectsFnType &
  MergeObjectsFnTypePartiallyApplied;
