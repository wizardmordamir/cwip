type WithoutKeys<T, K extends string> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

export const withoutKeys = <T extends Record<string, any>, K extends string>(
  obj: T,
  keys: K[],
): WithoutKeys<T, K> => {
  const entries = Object.entries(obj);
  return Object.fromEntries(entries.filter(([key]) => !keys.includes(key as K))) as WithoutKeys<
    T,
    K
  >;
};
