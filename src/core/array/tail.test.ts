import { describe, expect, it } from 'bun:test';
import { tail } from '.'; // Adjust path accordingly

describe('tail', () => {
  it('should return all elements except the first one', () => {
    expect(tail([1, 2, 3])).toEqual([2, 3]);
    expect(tail(['a', 'b', 'c'])).toEqual(['b', 'c']);
  });

  it('should return an empty array for an empty array', () => {
    expect(tail([])).toEqual([]);
  });

  it('should return an empty array for non-array inputs', () => {
    expect(tail(undefined as any)).toEqual([]);
    expect(tail(null as any)).toEqual([]);
    expect(tail({} as any)).toEqual([]);
    expect(tail(123 as any)).toEqual([]);
    expect(tail('string' as any)).toEqual([]);
  });
});
