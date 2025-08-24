/* eslint-disable */
type AnyFn = (..._ /* eslint-disable */ : any) => any;
type SideEffect = (_: AnyFn) => <T>(v: T) => T;
export const sideEffect: SideEffect = (fn) => (v) => {
  fn(v);
  return v;
};

type AnyFnAsync = (..._args: any) => Promise<any>;
type AsyncSideEffect = (fn: AnyFnAsync) => <T>(v: T) => Promise<T>;
export const asyncSideEffect: AsyncSideEffect = (fn) => async (v) => {
  await fn(v);
  return Promise.resolve(v);
};
