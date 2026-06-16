/**
 * Type predicates for nullish values
 */

export const isNull = (value: any): value is null => value === null;

export const isUndefined = (value: any): value is undefined => value === undefined;

export const isNullish = (value: any): value is null | undefined => value === null || value === undefined;

export const existy = <T>(val: T): boolean => typeof val !== 'undefined' && val !== null;

export const truthy = <T>(val: T): boolean => val !== false && existy(val);
