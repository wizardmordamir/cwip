export const removeDupsPrimitive = <T>(arr: T[]): T[] => [...new Set(arr)];
