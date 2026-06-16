import { describe, expect, it } from 'bun:test';
import { propEq } from './propEq';

describe('propEq', () => {
  it('is true only on a strict-equal value', () => {
    expect(propEq('role', 'admin')({ role: 'admin' })).toBe(true);
    expect(propEq('role', 'admin')({ role: 'user' })).toBe(false);
  });

  it('uses strict equality (no coercion)', () => {
    expect(propEq('id', 1)({ id: '1' as unknown as number })).toBe(false);
    expect(propEq('id', 1)({ id: 1 })).toBe(true);
  });

  it('works as a filter/find predicate', () => {
    const users = [
      { id: 1, role: 'admin' },
      { id: 2, role: 'user' },
      { id: 3, role: 'admin' },
    ];
    expect(users.filter(propEq('role', 'admin')).map((u) => u.id)).toEqual([1, 3]);
    expect(users.find(propEq('id', 2))?.role).toBe('user');
  });
});
