// generic function to name any function (useful for anonymous functions to log a name)
export const setFunctionName = <T extends (...args: any[]) => any>(name: string, fn: T): T => {
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};
