export const tryOr = <T, D = boolean>(fn: () => T, defaultValue: D = false as unknown as D): T | D => {
  try {
    return fn();
  } catch (_e) {
    return defaultValue;
  }
};

export const tryOrAsync = async <T, D = boolean>(
  fn: () => Promise<T> | T,
  defaultValue: D = false as unknown as D,
): Promise<T | D> => {
  try {
    return await fn();
  } catch (_e) {
    return defaultValue;
  }
};
