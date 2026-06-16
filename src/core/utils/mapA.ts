export const mapA =
  <T>(fn: (x: T) => T | Promise<T>) =>
  async (arr: T[]): Promise<T[]> =>
    Promise.all(arr.map(fn));
