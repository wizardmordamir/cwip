// These check whether arbitrary keys are present on an object, so the keys are
// `PropertyKey`s (not constrained to `keyof T`) — the whole point is to ask about
// keys that may be absent. The result is narrowed to the keys you passed.
export const getMissingKeys = <K extends PropertyKey>(obj: object, keys: readonly K[]): K[] => {
  return keys.filter((key) => !(key in obj));
};

export const throwIfMissingKeys = <K extends PropertyKey>(obj: object, keys: readonly K[]): void => {
  const missing = getMissingKeys(obj, keys);
  if (missing.length > 0) {
    // String() (not template/`+`) so symbol keys don't throw on conversion.
    throw new Error(`Missing keys: ${missing.map(String).join(', ')}`);
  }
};

export const allKeysExist = <K extends PropertyKey>(obj: object, keys: readonly K[]): boolean => {
  return keys.every((key) => key in obj);
};
