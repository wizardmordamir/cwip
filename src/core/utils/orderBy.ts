/**
 * Creates an array of elements, sorted in ascending/descending order by the results of running each element in a collection through an iteratee.
 * @param arr - The collection to iterate over.
 * @param prop - The property to sort by (can be a dot-separated path for nested properties).
 * @param order - The sort order ('asc' or 'desc').
 * @returns Returns the new sorted array.
 */
export const orderBy = <T extends Record<string, any>>(arr: T[], prop: string, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...arr].sort((a, b) => {
    const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, key) => acc?.[key], obj);

    const aValue = getNestedValue(a, prop);
    const bValue = getNestedValue(b, prop);

    // Special handling for undefined and null
    const aType = aValue === null ? 1 : aValue === undefined ? 0 : 2;
    const bType = bValue === null ? 1 : bValue === undefined ? 0 : 2;

    if (aType !== bType) {
      return order === 'asc' ? aType - bType : bType - aType;
    }

    // Normal comparison for defined values
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};
