export const filterA =
  <T>(predicate: (value: T) => boolean | Promise<boolean>) =>
  async (arr: T[]): Promise<T[]> => {
    const results = await Promise.all(arr.map(predicate));
    return arr.filter((_, index) => results[index]);
  };
