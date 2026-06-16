import { describe, expect, it } from 'bun:test';
import { prop } from './prop';

describe('prop', () => {
  it('returns a getter for the key', () => {
    expect(prop('name')({ name: 'Ada', age: 36 })).toBe('Ada');
    expect(prop('age')({ name: 'Ada', age: 36 })).toBe(36);
  });

  it('drops into map point-free', () => {
    const users = [{ name: 'Ada' }, { name: 'Linus' }];
    expect(users.map(prop('name'))).toEqual(['Ada', 'Linus']);
  });

  it('reads symbol and numeric keys', () => {
    const sym = Symbol('s');
    expect(prop(sym)({ [sym]: 7 })).toBe(7);
    expect(prop(0)(['first', 'second'])).toBe('first');
  });

  it('yields undefined for a missing value', () => {
    expect(prop('missing')({ missing: undefined })).toBeUndefined();
  });
});
