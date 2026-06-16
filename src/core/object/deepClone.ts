/**
 * Structural deep clone (`structuredClone`), typed to preserve the input's
 * type. Handles Dates, Maps, Sets, typed arrays, and circular references —
 * unlike a JSON round-trip, which silently drops functions/undefined and turns
 * Dates into strings. Throws `DataCloneError` for uncloneable values
 * (functions, DOM nodes) instead of silently losing them.
 */
export const deepClone = <T>(obj: T): T => structuredClone(obj);
