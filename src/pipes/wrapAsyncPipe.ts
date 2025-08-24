import { asyncPipe } from './asyncPipe';

export const wrapAsyncPipe =
  <U>(
    wrapper: (_fn: (_value: U) => U | Promise<U>) => (_value: U) => Promise<U>,
    errorHandler: (_error: any) => U,
  ) =>
  (...fns: ((_value: U) => U | Promise<U>)[]) => {
    const wrappedFns = fns.map(wrapper);
    return (initialValue: U): Promise<U> => {
      return asyncPipe(...wrappedFns)(initialValue).catch(errorHandler);
    };
  };
