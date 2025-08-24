/* eslint-disable */
export type ReducerFnType<R, I> = (acc: R, curr: I, index?: number, arr?: I[]) => R;
export type ReduceType = <R, I>(reducerFn: ReducerFnType<R, I>, initialValue: R) => (arr: I[]) => R;

export const reduce: ReduceType = (reducerFn, initialValue) => (arr) =>
  arr.reduce(reducerFn, initialValue);
