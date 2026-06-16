import { describe, expect, it } from 'bun:test';
import { missingKeys } from './index';

describe('missingKeys', () => {
  it('should find missing keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(missingKeys(keys, obj)).toEqual(['d', 'e', 'f']);
  });
});
