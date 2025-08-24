/* eslint-disable */
export interface FunctorInterface<T> {
  map: (f: Function) => FunctorInterface<T>;
}
