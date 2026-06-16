import { describe, expect, it } from 'bun:test';
import { isFunction } from './isFunction';

describe('isFunction', () => {
  it('is true for functions', () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function named() {})).toBe(true);
    expect(isFunction(async () => {})).toBe(true);
    expect(isFunction(class C {})).toBe(true);
    expect(isFunction(Math.max)).toBe(true);
  });

  it('is false for non-functions', () => {
    expect(isFunction(undefined)).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction(0)).toBe(false);
    expect(isFunction('fn')).toBe(false);
    expect(isFunction({})).toBe(false);
    expect(isFunction([])).toBe(false);
    expect(isFunction(/regex/)).toBe(false);
  });
});
