import { curry } from '../flow';
import { type Path, path } from '../object';

const _uniqueBy = <T extends object>(deepKey: string, arr: T[]): T[] => {
  if (!Array.isArray(arr)) return [];

  const seen = new Set<unknown>();

  // Create the getter once outside the filter for performance.
  // We cast to 'any' here because 'deepKey' is a general string,
  // but path wants a specific 'Path<T>'.
  const getter = path(deepKey as any);

  return arr.filter((item) => {
    if (!item) return false;

    const val = getter(item);

    if (seen.has(val)) return false;

    seen.add(val);
    return true;
  });
};

export const uniqueBy = curry(_uniqueBy as any) as unknown as {
  // valid literal key into the element -> autocomplete + typo-safety on the key
  <T extends object, P extends Path<T>>(deepKey: P, arr: T[]): T[];
  // dynamic key fallback
  <T extends object>(deepKey: string, arr: T[]): T[];
  // data-last curried form (element type deferred, so key isn't checked here)
  (deepKey: string): <T extends object>(arr: T[]) => T[];
};
