import { describe, expect, it } from 'bun:test';
import { objHasKey } from './objHasKey';

// objHasKey is the (obj, key)-ordered sibling of hasKey (key, obj). (This file
// previously duplicated hasKey.test.ts and never exercised objHasKey itself.)
describe('objHasKey', () => {
  it('is true for own enumerable keys', () => {
    expect(objHasKey({ a: 1 }, 'a')).toBe(true);
    expect(objHasKey({ a: undefined }, 'a')).toBe(true);
    expect(objHasKey({ a: 1, b: null, c: { d: 1 } }, 'c')).toBe(true);
  });

  it('is false for absent keys', () => {
    expect(objHasKey({ a: 1 }, 'b')).toBe(false);
    expect(objHasKey({ a: 1, b: null, c: { d: 1 } }, 'f')).toBe(false);
  });

  it('is false for inherited (non-own) properties', () => {
    expect(objHasKey({}, 'toString')).toBe(false);
    expect(objHasKey({}, 'hasOwnProperty')).toBe(false);
  });

  it('supports curried application', () => {
    const inConfig = objHasKey({ debug: true, level: 3 });
    expect(inConfig('debug')).toBe(true);
    expect(inConfig('missing')).toBe(false);
  });
});
