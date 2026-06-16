/**
 * Type predicates for parsing string values
 */

export const isStringNumber = (value: any): boolean =>
  typeof value === 'string' &&
  value.trim() !== '' &&
  !['Infinity', '-Infinity', 'NaN'].includes(value.trim()) &&
  !Number.isNaN(Number(value));

export const isStringBoolean = (value: any): boolean =>
  typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false');

export const isStringNull = (value: any): boolean => typeof value === 'string' && value.toLowerCase() === 'null';
