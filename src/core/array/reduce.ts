export type ReducerFnType<R, I> = (acc: R, curr: I, index: number, arr: I[]) => R;

/**
 * Executes a reducer function on each element of the array,
 * resulting in a single output value.
 */
export const reduce =
  <R, I>(reducerFn: ReducerFnType<R, I>, initialValue: R) =>
  (arr: I[]): R => {
    if (!Array.isArray(arr)) {
      // In functional programming, reducing a non-iterable
      // usually returns the initial value (the identity).
      return initialValue;
    }

    return arr.reduce(reducerFn, initialValue);
  };
