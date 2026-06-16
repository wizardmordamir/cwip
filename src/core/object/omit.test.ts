import { describe, expect, it } from 'bun:test';
import { omit } from '.';

describe('omit', () => {
  it('should remove keys from object', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(omit(['b', 'c'], val)).toEqual({ a: 1 });
  });
});
