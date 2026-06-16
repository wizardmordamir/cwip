import { describe, expect, it } from 'bun:test';
import { sumBy } from './sumBy';

describe('sumBy', () => {
  it('sums a shallow numeric key across the array', () => {
    expect(sumBy('value', [{ value: 1 }, { value: 2 }, { value: 3 }])).toBe(6);
  });

  it('sums a deep (dotted) key', () => {
    expect(sumBy('a.b', [{ a: { b: 5 } }, { a: { b: 7 } }])).toBe(12);
  });

  it('supports curried application', () => {
    const totalPrice = sumBy('price');
    expect(totalPrice([{ price: 10 }, { price: 15 }])).toBe(25);
  });

  it('coerces numeric strings and treats invalid/missing values as 0', () => {
    expect(sumBy('v', [{ v: '5' }, { v: 'oops' }, { v: 3 }])).toBe(8);
    expect(sumBy('v', [{}, { v: 2 }])).toBe(2);
  });

  it('sums the items directly when the key is empty', () => {
    expect(sumBy('', [1, 2, 3])).toBe(6);
  });

  it('returns 0 for an empty array or a non-array', () => {
    expect(sumBy('value', [])).toBe(0);
    expect(sumBy('value', null as any)).toBe(0);
    expect(sumBy('value', undefined as any)).toBe(0);
  });
});
