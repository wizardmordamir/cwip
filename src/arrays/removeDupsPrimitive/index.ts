export const removeDupsPrimitive = <T>(arr: T[]): T[] => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return [...new Set(arr)];
};
