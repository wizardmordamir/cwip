import { describe, expect, it } from 'bun:test';
import { isString } from '../is';
import { randomAlphaNumeric } from './randomAlphaNumeric';

describe('randomAlphaNumeric', () => {
  it('should create random alpah numeric string to given length', () => {
    const lens = [1, 5, 10];
    expect(lens.map(randomAlphaNumeric).map((val) => isString(val) && val.length)).toEqual(lens);
  });
});
