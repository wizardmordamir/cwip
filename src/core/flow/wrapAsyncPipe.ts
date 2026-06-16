import { pipeAsync } from './pipeAsync';

export const wrapPipeAsync =
  <U = any>(
    functionWrapper?: (_fn: (_value: U) => U | Promise<U>) => (_value: U) => Promise<U>,
    errorHandler?: (_error: any) => U,
  ) =>
  (...fns: ((_value: U) => U | Promise<U>)[]) => {
    const wrappedFns = functionWrapper ? fns.map(functionWrapper) : fns;
    return (initialValue: U): Promise<U> => {
      return pipeAsync(...wrappedFns)(initialValue).catch(errorHandler ?? ((err: any) => Promise.reject(err)));
    };
  };
