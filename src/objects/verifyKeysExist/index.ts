export const getMissingKeys = <T extends object>(
  obj: T,
  keys: (keyof T)[],
): (keyof T)[] | undefined => {
  const missingKeys: (keyof T)[] = [];
  for (const key of keys) {
    if (!(key in obj)) {
      missingKeys.push(key);
    }
  }
  return missingKeys.length ? missingKeys : undefined;
};

export const throwIfMissingKeys = <T extends object>(obj: T, keys: (keyof T)[]): void => {
  const missingKeys = getMissingKeys(obj, keys);
  if (missingKeys) {
    throw new Error(`Missing keys: ${missingKeys.join(', ')}`);
  }
};

export const allKeysExist = <T extends object>(obj: T, keys: (keyof T)[]): boolean =>
  !!getMissingKeys(obj, keys);
