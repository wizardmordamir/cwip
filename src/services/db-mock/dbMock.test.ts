import { describe, expect, it } from 'bun:test';
import type { CaptureRecord } from '../../core/capture';
import { fixtureTypes, fromCaptureRecords, registerFixtures } from './fixtures';
import { toMongoCall } from './matchMongo';
import { compileSqlMatcher, normalizeSql, sqlKeywords, sqlParamCount } from './matchSql';
import { createDbMockRegistry } from './registry';
import type { DbFixture } from './types';

describe('SQL matching', () => {
  it('normalizes whitespace, case, punctuation and placeholders', () => {
    expect(normalizeSql('SELECT *  FROM users\n WHERE id = $1')).toBe('select * from users where id =');
    expect(sqlParamCount('select * from t where a = $1 and b = $2')).toBe(2);
    expect(sqlParamCount('select * from t where a = ? and b = ?')).toBe(2);
    expect(sqlKeywords('SELECT * FROM users WHERE id = $1')).toEqual(['select', 'from', 'users', 'where']);
  });

  it('matches queries by keyword sequence regardless of literal values/spacing', () => {
    const match = compileSqlMatcher([{ query: 'select * from users where id = $1', rows: () => [] }]);
    expect(match('SELECT  *  FROM users  WHERE id = $1', [5])).not.toBeNull();
    expect(match('select * from orders where id = $1', [5])).toBeNull();
  });

  it('prefers the more specific handler and disambiguates by param count', () => {
    const match = compileSqlMatcher([
      { name: 'all', query: 'select * from users', rows: () => [] },
      { name: 'byId', query: 'select * from users where id = $1', rows: () => [] },
    ]);
    expect(match('select * from users where id = $1', [1])?.name).toBe('byId');
    expect(match('select * from users', [])?.name).toBe('all');
  });
});

describe('createDbMockRegistry (multi-datasource)', () => {
  it('routes SQL and Mongo to the right datasource', async () => {
    const reg = createDbMockRegistry([
      {
        id: 'mainPg',
        kind: 'postgres',
        sql: [{ query: 'select * from users where id = $1', rows: ({ params }) => [{ id: params[0], src: 'pg' }] }],
      },
      {
        id: 'analytics',
        kind: 'mongodb',
        mongo: [{ collection: 'events', operation: 'find', result: () => [{ type: 'click' }] }],
      },
    ]);
    expect(await reg.resolveSql('mainPg', 'SELECT * FROM users WHERE id = $1', [7])).toEqual([{ id: 7, src: 'pg' }]);
    expect(await reg.resolveMongo('analytics', toMongoCall('events', 'find', [{}]))).toEqual([{ type: 'click' }]);
  });

  it('returns empty/null on no match unless throwOnNoMatch', async () => {
    const lenient = createDbMockRegistry([{ id: 'a', kind: 'postgres' }]);
    expect(await lenient.resolveSql('a', 'select 1')).toEqual([]);
    const strict = createDbMockRegistry([{ id: 'b', kind: 'postgres', throwOnNoMatch: true }]);
    await expect(strict.resolveSql('b', 'select 1')).rejects.toThrow(/no SQL handler/);
  });

  it('supports a mutable record store for stateful handlers', async () => {
    const reg = createDbMockRegistry([
      {
        id: 's',
        kind: 'postgres',
        records: { users: [{ id: 1 }] },
        sql: [{ query: 'select count from users', rows: ({ records }) => [{ count: records.users.length }] }],
      },
    ]);
    expect(await reg.resolveSql('s', 'select count from users')).toEqual([{ count: 1 }]);
  });
});

describe('fixtures: replay + capture + type-gen', () => {
  const fixture: DbFixture = {
    id: 'active-users',
    datasource: 'mainPg',
    kind: 'postgres',
    operation: 'select id, email from users where active = $1',
    params: [true],
    inputSample: { active: true },
    result: [
      { id: 1, email: 'a@x.com' },
      { id: 2, email: 'b@x.com', nickname: 'bee' },
    ],
  };

  it('registers fixtures as replay handlers (auto-creating the datasource)', async () => {
    const reg = createDbMockRegistry();
    registerFixtures(reg, [fixture]);
    const rows = await reg.resolveSql('mainPg', 'SELECT id, email FROM users WHERE active = $1', [true]);
    expect(rows).toHaveLength(2);
  });

  it('derives input + response TypeScript types from a fixture', () => {
    const { output, input } = fixtureTypes(fixture);
    expect(output).toContain('export interface ActiveUsersRow {');
    expect(output).toContain('id: number;');
    expect(output).toMatch(/nickname\?: string;/);
    expect(input).toContain('export interface ActiveUsersInput {');
    expect(input).toContain('active: boolean;');
  });

  it('converts capture records into fixtures', () => {
    const records: CaptureRecord[] = [
      {
        label: 'list-users',
        kind: 'db',
        timestamp: '2026-01-01T00:00:00.000Z',
        durationMs: 3,
        request: { sql: 'select * from users', params: [] },
        response: { rows: [{ id: 1 }] },
      },
    ];
    const fixtures = fromCaptureRecords(records, { datasource: 'mainPg', kind: 'postgres' });
    expect(fixtures[0]).toMatchObject({ datasource: 'mainPg', operation: 'select * from users', result: [{ id: 1 }] });
  });
});
