export const last = <T>(arr: T[]): T | undefined =>
  Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : undefined;
