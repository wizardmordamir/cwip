import { curry } from '../flow';

/**
 * Returns a new array with elements removed or replaced.
 * Signature: (start, deleteCount, items) => (arr) => result
 */
export const splice = curry(<T>(start: number, deleteCount: number, items: T[], arr: T[]): T[] => {
  const target = Array.isArray(arr) ? arr : [];
  // items MUST be an array for this implementation
  return (target as any).toSpliced(start, deleteCount, ...items);
}) as unknown as {
  <T>(start: number, deleteCount: number, items: T[], arr: T[]): T[];
  <T>(start: number, deleteCount: number, items: T[]): (arr: T[]) => T[];
};
