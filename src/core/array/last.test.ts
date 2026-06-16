import { describe, expect, it } from 'bun:test';
import { last } from '.'; // Adjust path accordingly

describe('last', () => {
  it('should return the last element of an array', () => {
    expect(last([1, 2, 3])).toEqual(3);
    expect(last(['a', 'b', 'c'])).toEqual('c');
  });

  it('should return undefined for an empty array', () => {
    expect(last([])).toEqual(undefined);
  });

  it('should return undefined for non-array inputs', () => {
    expect(last(undefined as any)).toEqual(undefined);
    expect(last(null as any)).toEqual(undefined);
    expect(last({} as any)).toEqual(undefined);
    expect(last(123 as any)).toEqual(undefined);
    expect(last('string' as any)).toEqual(undefined);
  });
});
