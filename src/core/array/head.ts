/**
 * Returns the first element of an array (FP standard).
 */
export const head = <T>(arr: T[]): T | undefined => (Array.isArray(arr) ? arr[0] : undefined);
