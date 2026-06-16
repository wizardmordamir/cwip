import { describe, expect, it } from 'bun:test';
import { prop, propEq, where } from '.';

const users = [
  { name: 'Ada', role: 'admin', age: 36 },
  { name: 'Bo', role: 'user', age: 9 },
  { name: 'Cy', role: 'admin', age: 50 },
];

describe('prop', () => {
  it('is a data-last accessor usable in map', () => {
    expect(users.map(prop('name'))).toEqual(['Ada', 'Bo', 'Cy']);
    expect(prop('age')(users[0])).toBe(36);
  });
});

describe('propEq', () => {
  it('is a data-last equality predicate for filter/find', () => {
    expect(users.filter(propEq('role', 'admin')).map(prop('name'))).toEqual(['Ada', 'Cy']);
    expect(users.find(propEq('name', 'Bo'))?.age).toBe(9);
  });
});

describe('where', () => {
  it('matches an object against a spec of predicates', () => {
    const adult = where<(typeof users)[number]>({ age: (n) => n >= 18, role: (r) => r === 'admin' });
    expect(users.filter(adult).map(prop('name'))).toEqual(['Ada', 'Cy']);
  });

  it('ignores keys absent from the spec', () => {
    expect(where<{ a: number; b: number }>({ a: (n) => n > 0 })({ a: 1, b: -5 })).toBe(true);
  });
});
