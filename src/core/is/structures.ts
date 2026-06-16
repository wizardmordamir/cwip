export const isObjectNotArray = <T>(val: T): boolean => typeof val === 'object' && val !== null && !Array.isArray(val);

// return true if all keys in obj are either not existy, empty arrays, or empty objects
