import { describe, expect, it } from 'bun:test';
import { length } from '.';

describe('length', () => {
  it('should get length of array', () => {
    expect(length(['duck', 'duck', 'goose'])).toEqual(3);
    expect(length([])).toEqual(0);
  });
  it('return 0 if undefined or null or other non array/object', () => {
    expect(length(undefined)).toEqual(0);
    expect(length(null)).toEqual(0);
  });
});
