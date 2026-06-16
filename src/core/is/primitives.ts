/**
 * Type predicates for primitive types
 */

export const isString = (value: any): value is string => typeof value === 'string';

export const isNumber = (value: any): value is number => typeof value === 'number' && !Number.isNaN(value);

export const isBoolean = (value: any): value is boolean => typeof value === 'boolean';

export const isPrimitive = (value: any): boolean =>
  value === null || value === undefined || (typeof value !== 'object' && typeof value !== 'function');

export const isStringOrInstanceString = (value: any): value is string =>
  typeof value === 'string' || value instanceof String;
