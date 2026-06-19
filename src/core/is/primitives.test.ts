import { describe, expect, it } from 'bun:test';
import { isBoolean, isNumber, isPrimitive, isString, isStringOrInstanceString } from '.';

describe('isString', () => {
  it('returns true for string primitives only', () => {
    expect(isString('hello')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString({})).toBe(false);
  });
});

describe('isNumber', () => {
  it('returns true for finite number primitives', () => {
    expect(isNumber(1)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
  });

  it('returns false for NaN (unlike typeof)', () => {
    expect(isNumber(Number.NaN)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isNumber('1')).toBe(false);
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber(true)).toBe(false);
  });
});

describe('isBoolean', () => {
  it('returns true for true and false only', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean('')).toBe(false);
    expect(isBoolean(null)).toBe(false);
  });
});

describe('isPrimitive', () => {
  it('returns true for null, undefined, number, string, boolean, symbol', () => {
    expect(isPrimitive(null)).toBe(true);
    expect(isPrimitive(undefined)).toBe(true);
    expect(isPrimitive(1)).toBe(true);
    expect(isPrimitive('x')).toBe(true);
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive(Symbol())).toBe(true);
  });

  it('returns false for objects and functions', () => {
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive(() => {})).toBe(false);
  });
});

describe('isStringOrInstanceString', () => {
  it('returns true for string primitives and false for non-strings', () => {
    expect(isStringOrInstanceString('hello')).toBe(true);
    expect(isStringOrInstanceString('')).toBe(true);
    expect(isStringOrInstanceString(1)).toBe(false);
    expect(isStringOrInstanceString(null)).toBe(false);
    expect(isStringOrInstanceString(undefined)).toBe(false);
  });
});
