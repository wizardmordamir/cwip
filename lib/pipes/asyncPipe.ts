export const asyncPipe = <T>(...fns: ((value: T) => T | Promise<T>)[]) => {
  return (initialValue: T): Promise<T> => {
    let result: Promise<T> = Promise.resolve(initialValue);
    for (const fn of fns) {
      result = result.then(fn);
    }
    return result as Promise<T>;
  };
};
