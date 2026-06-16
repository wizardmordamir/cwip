export const isEmpty = (value: any): boolean => {
  // 1. Null/Undefined
  if (value == null) return true;

  // 2. Arrays or Strings (have .length)
  if (typeof value.length === 'number') {
    return value.length === 0;
  }

  // 3. Sets and Maps (have .size)
  if (typeof value.size === 'number') {
    return value.size === 0;
  }

  // 4. Objects
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  // 5. Primitives (numbers, booleans) are considered "not empty"
  return false;
};
