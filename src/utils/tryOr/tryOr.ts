export const tryOr = <T>(fn: () => T, defaultValue: any = false): T => {
  try {
    return fn();
  } catch (e) {
    return defaultValue;
  }
};

export const tryOrAsync = async <T>(
  fn: () => Promise<T> | T,
  defaultValue: any = false,
): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    return defaultValue;
  }
};
