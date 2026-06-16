import { describe, expect, it } from 'bun:test';
import { not } from './not';

describe('not', () => {
  it('returns a predicate that negates the wrapped predicate', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isOdd = not(isEven);
    expect(isOdd(3)).toBe(true);
    expect(isOdd(4)).toBe(false);
  });

  it('coerces the wrapped result to a boolean', () => {
    const truthy = not((v: any) => v);
    expect(truthy(0)).toBe(true);
    expect(truthy('x')).toBe(false);
  });

  it('works as an array filter', () => {
    const isNil = (v: any) => v == null;
    expect([1, null, 2, undefined, 3].filter(not(isNil))).toEqual([1, 2, 3]);
  });
});
