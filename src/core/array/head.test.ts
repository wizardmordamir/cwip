import { describe, expect, it } from 'bun:test';
import { head } from '.'; // Adjust path accordingly

describe('head', () => {
  it('should return the head element of an array', () => {
    expect(head([1, 2, 3])).toEqual(1);
    expect(head(['a', 'b', 'c'])).toEqual('a');
  });

  it('should return undefined for an empty array', () => {
    expect(head([])).toBeUndefined();
  });

  it('should return undefined for non-array inputs', () => {
    expect(head(undefined as any)).toBeUndefined();
    expect(head(null as any)).toBeUndefined();
    expect(head({} as any)).toBeUndefined();
    expect(head(123 as any)).toBeUndefined();
    expect(head('string' as any)).toBeUndefined();
  });
});
