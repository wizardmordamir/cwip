/**
 * Synchronous Tap
 */
export const tap =
  <T>(fn: (v: T) => any) =>
  (v: T): T => {
    fn(v);
    return v;
  };

/**
 * Asynchronous Tap
 */
export const tapAsync =
  <T>(fn: (v: T) => Promise<any>) =>
  async (v: T): Promise<T> => {
    await fn(v);
    return v;
  };
