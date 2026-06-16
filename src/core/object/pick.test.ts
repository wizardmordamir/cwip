import { describe, expect, it } from 'bun:test';
import { pick } from './pick';

describe('pick', () => {
  it('returns an object with only the requested keys', () => {
    expect(pick(['a', 'c'])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('returns an empty object when no keys are requested', () => {
    expect(pick([])({ a: 1, b: 2 })).toEqual({});
  });

  it('includes requested keys that are absent on the source as undefined', () => {
    const result = pick(['a', 'z'])({ a: 1 });
    expect(result).toEqual({ a: 1, z: undefined });
    expect(Object.keys(result)).toEqual(['a', 'z']);
  });

  it('is reusable as a partially-applied selector', () => {
    const pickName = pick(['name']);
    expect(pickName({ name: 'Ada', age: 36 })).toEqual({ name: 'Ada' });
    expect(pickName({ name: 'Linus', os: 'linux' })).toEqual({ name: 'Linus' });
  });

  it('does not mutate the source object', () => {
    const source = { a: 1, b: 2 };
    pick(['a'])(source);
    expect(source).toEqual({ a: 1, b: 2 });
  });
});
