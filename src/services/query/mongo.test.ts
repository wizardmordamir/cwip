import { describe, expect, it } from 'bun:test';
import { buildMongoFind, conditionsToMongoFilter, toMongoShell } from './mongo';
import type { Condition } from './types';

describe('conditionsToMongoFilter', () => {
  it('maps each operator to its mongo form', () => {
    expect(conditionsToMongoFilter([{ column: 'a', op: '=', value: 1 }])).toEqual({ a: 1 });
    expect(conditionsToMongoFilter([{ column: 'a', op: '!=', value: 1 }])).toEqual({ a: { $ne: 1 } });
    expect(conditionsToMongoFilter([{ column: 'a', op: '>', value: 1 }])).toEqual({ a: { $gt: 1 } });
    expect(conditionsToMongoFilter([{ column: 'a', op: 'in', value: [1, 2] }])).toEqual({ a: { $in: [1, 2] } });
    expect(conditionsToMongoFilter([{ column: 'a', op: 'is null' }])).toEqual({ a: null });
    expect(conditionsToMongoFilter([{ column: 'a', op: 'is not null' }])).toEqual({ a: { $ne: null } });
    expect(conditionsToMongoFilter([{ column: 'a', op: 'between', value: [1, 9] }])).toEqual({
      a: { $gte: 1, $lte: 9 },
    });
  });

  it('translates LIKE patterns to anchored regex', () => {
    const f = conditionsToMongoFilter([{ column: 'email', op: 'like', value: '%@x.com' }]) as {
      email: { $regex: RegExp };
    };
    expect(f.email.$regex).toBeInstanceOf(RegExp);
    expect(f.email.$regex.test('a@x.com')).toBe(true);
    expect(f.email.$regex.test('a@y.com')).toBe(false);
  });

  it('combines multiple conditions with $and / $or', () => {
    const conds: Condition[] = [
      { column: 'a', op: '=', value: 1 },
      { column: 'b', op: '=', value: 2 },
    ];
    expect(conditionsToMongoFilter(conds, 'and')).toEqual({ $and: [{ a: 1 }, { b: 2 }] });
    expect(conditionsToMongoFilter(conds, 'or')).toEqual({ $or: [{ a: 1 }, { b: 2 }] });
  });
});

describe('buildMongoFind', () => {
  it('assembles filter + options', () => {
    const built = buildMongoFind({
      collection: 'users',
      conditions: [{ column: 'age', op: '>=', value: 18 }],
      projection: { _id: 0, email: 1 },
      sort: { created_at: -1 },
      limit: 25,
      skip: 5,
    });
    expect(built.collection).toBe('users');
    expect(built.filter).toEqual({ age: { $gte: 18 } });
    expect(built.options).toEqual({ projection: { _id: 0, email: 1 }, sort: { created_at: -1 }, limit: 25, skip: 5 });
  });
});

describe('toMongoShell', () => {
  it('renders a copyable db.coll.find(...).sort().limit() with /regex/ literals', () => {
    const shell = toMongoShell({
      collection: 'users',
      conditions: [{ column: 'email', op: 'like', value: 'a%' }],
      sort: { name: 1 },
      limit: 10,
    });
    expect(shell).toContain('db.users.find(');
    expect(shell).toContain('"$regex":/^a.*$/');
    expect(shell).toContain('.sort({"name":1})');
    expect(shell).toContain('.limit(10)');
  });
});
