import { curry } from '../flow/curry';

type MergeObjectsFnType = <A extends object, B extends object>(objA: A, objB: B) => A & B;
type MergeObjectsFnTypePartiallyApplied = <A extends object>(objA: A) => <B extends object>(objB: B) => A & B;

export const mergeObjects = curry((objA: any, objB: any) => {
  if (typeof objA !== 'object' || objA === null || (Array.isArray(objA) && !Array.isArray(objB))) {
    return objA;
  }
  if (typeof objB !== 'object' || objB === null || Array.isArray(objB)) {
    return objB;
  }
  return { ...objA, ...objB };
  // The dual-overload type is applied to the export so generics survive curry().
}) as unknown as MergeObjectsFnType & MergeObjectsFnTypePartiallyApplied;
