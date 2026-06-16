/**
 * T: The current Context type
 * K: The new key name
 * R: The result of the function being assigned
 */
export const assign = <K extends string, R, T extends object = object>(key: K, fn: (ctx: T) => R | Promise<R>) => {
  // We return a generic function so that T is inferred from the actual ctx passed in
  return async <Input extends T>(ctx: Input): Promise<Input & Record<K, Awaited<R>>> => {
    const result = await fn(ctx as T);
    return {
      ...ctx,
      [key]: result,
    } as Input & Record<K, Awaited<R>>;
  };
};
