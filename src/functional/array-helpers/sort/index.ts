/* eslint-disable */
export const sort =
  <I, R extends number>(sortFn?: (a: I, b: I) => R) =>
  (array: I[]) =>
    array.sort(sortFn);
