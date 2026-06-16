import { describe, expect, it } from 'bun:test';
import { where } from './where';

type User = { age: number; status: string; name: string };

describe('where', () => {
  it('is true only when every spec predicate passes', () => {
    const active = where<User>({ age: (n) => n >= 18, status: (s) => s === 'active' });
    expect(active({ age: 20, status: 'active', name: 'Ada' })).toBe(true);
    expect(active({ age: 16, status: 'active', name: 'Kid' })).toBe(false);
    expect(active({ age: 20, status: 'banned', name: 'Mal' })).toBe(false);
  });

  it('ignores keys absent from the spec', () => {
    const matchAge = where<User>({ age: (n) => n === 30 });
    expect(matchAge({ age: 30, status: 'anything', name: 'x' })).toBe(true);
  });

  it('an empty spec matches everything', () => {
    expect(where<User>({})({ age: 0, status: '', name: '' })).toBe(true);
  });

  it('composes with filter', () => {
    const users: User[] = [
      { age: 20, status: 'active', name: 'a' },
      { age: 17, status: 'active', name: 'b' },
      { age: 40, status: 'inactive', name: 'c' },
    ];
    const adultsActive = where<User>({ age: (n) => n >= 18, status: (s) => s === 'active' });
    expect(users.filter(adultsActive).map((u) => u.name)).toEqual(['a']);
  });
});
