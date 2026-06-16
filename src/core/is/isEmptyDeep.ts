export const isEmptyDeep = (value: any, seen = new WeakSet()): boolean => {
  // 1. Primitives & Nullish
  if (value === null || value === undefined) return true;

  // 2. Circular Reference Check
  // We only track objects/arrays; primitives are not circular.
  if (typeof value === 'object') {
    if (seen.has(value)) return true; // Already visited, treat as "empty" to break loop
    seen.add(value);
  }

  // 3. Arrays
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isEmptyDeep(item, seen));
  }

  // 4. Maps & Sets — empty iff their size is 0. Checked BEFORE the plain-object
  // branch: Maps/Sets have no enumerable own keys, so Object.keys() is always []
  // and would otherwise report a populated collection as "empty".
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  // 5. Objects
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length === 0 || keys.every((key) => isEmptyDeep(value[key], seen));
  }

  // 6. Strings
  if (typeof value === 'string') return value.trim().length === 0;

  // 7. Default: Not empty (numbers, booleans, etc.)
  return false;
};
