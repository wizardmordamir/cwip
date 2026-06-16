import { describe, expect, it } from 'bun:test';
import { minMaxValue } from './minMaxValue';

describe('minMaxValue', () => {
  it('should return the minimum value when the input is less than the minimum', () => {
    expect(minMaxValue(1, 10, 5)).toBe(5);
  });

  it('should return the maximum value when the input is greater than the maximum', () => {
    expect(minMaxValue(1, 10, 15)).toBe(10);
  });

  it('should return the input value when it is within the range', () => {
    expect(minMaxValue(1, 10, 7)).toBe(7);
  });
});
