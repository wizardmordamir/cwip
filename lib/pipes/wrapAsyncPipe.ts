import { asyncPipe } from './asyncPipe';

export const wrapAsyncPipe =
  <U>(
    wrapper: (fn: (value: U) => U | Promise<U>) => (value: U) => Promise<U>,
    errorHandler: (error: any) => U,
  ) =>
  (...fns: ((value: U) => U | Promise<U>)[]) => {
    const wrappedFns = fns.map(wrapper);
    return (initialValue: U): Promise<U> => {
      return asyncPipe(...wrappedFns)(initialValue).catch(errorHandler);
    };
  };
