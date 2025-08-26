/* eslint-disable */
import { curry } from '../curry';

type MergeObjectsFnType = <A extends object, B extends object>(objA: A, objB: B) => A & B;
type MergeObjectsFnTypePartiallyApplied = <A extends object>(
  objA: A,
) => <B extends object>(objB: B) => A & B;

export const mergeObjects = curry((objA, objB) => {
  if (typeof objA !== 'object' || objA === null || (Array.isArray(objA) && !Array.isArray(objB))) {
    return objA;
  }
  if (typeof objB !== 'object' || objB === null || Array.isArray(objB)) {
    return objB;
  }
  return { ...objA, ...objB } as MergeObjectsFnType & MergeObjectsFnTypePartiallyApplied;
});
