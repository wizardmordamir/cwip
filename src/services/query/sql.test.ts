import { describe, expect, it } from 'bun:test';
import { buildSelect, toInlineSql } from './sql';
import type { SqlSelectSpec } from './types';

const spec: SqlSelectSpec = {
  schema: 'public',
  table: 'users',
  columns: ['id', 'email'],
  where: [
    { column: 'email', op: 'like', value: '%@x.com' },
    { column: 'age', op: 'between', value: [18, 65] },
    { column: 'role', op: 'in', value: ['admin', 'mod'] },
    { column: 'deleted_at', op: 'is null' },
  ],
  orderBy: [{ column: 'created_at', direction: 'desc' }],
  limit: 50,
};

describe('buildSelect — postgres', () => {
  it('quotes with ", uses $N placeholders, binds values in order', () => {
    const { sql, params } = buildSelect(spec, 'postgres');
    expect(sql).toContain('SELECT "id", "email"');
    expect(sql).toContain('FROM "public"."users"');
    expect(sql).toContain('"email" LIKE $1');
    expect(sql).toContain('"age" BETWEEN $2 AND $3');
    expect(sql).toContain('"role" IN ($4, $5)');
    expect(sql).toContain('"deleted_at" IS NULL');
    expect(sql).toContain('ORDER BY "created_at" DESC');
    expect(sql).toContain('LIMIT 50');
    expect(params).toEqual(['%@x.com', 18, 65, 'admin', 'mod']);
  });
});

describe('buildSelect — mysql', () => {
  it('quotes with backticks and uses ? placeholders', () => {
    const { sql, params } = buildSelect(spec, 'mysql');
    expect(sql).toContain('SELECT `id`, `email`');
    expect(sql).toContain('FROM `public`.`users`');
    expect(sql).toContain('`email` LIKE ?');
    expect(sql).toContain('LIMIT 50');
    expect(params).toEqual(['%@x.com', 18, 65, 'admin', 'mod']);
  });
});

describe('buildSelect — mssql', () => {
  it('uses [ ] quoting, @pN placeholders, OFFSET/FETCH with ORDER BY', () => {
    const { sql } = buildSelect(spec, 'mssql');
    expect(sql).toContain('SELECT [id], [email]');
    expect(sql).toContain('FROM [public].[users]');
    expect(sql).toContain('[email] LIKE @p1');
    expect(sql).toContain('OFFSET 0 ROWS');
    expect(sql).toContain('FETCH NEXT 50 ROWS ONLY');
  });

  it('uses TOP for a bare limit with no ORDER BY', () => {
    const { sql } = buildSelect({ table: 't', limit: 10 }, 'mssql');
    expect(sql).toContain('SELECT TOP (10) *');
    expect(sql).not.toContain('FETCH NEXT');
  });

  it('empty IN () degrades to 1=0 (valid SQL), not a syntax error', () => {
    const { sql } = buildSelect({ table: 't', where: [{ column: 'x', op: 'in', value: [] }] }, 'postgres');
    expect(sql).toContain('1=0');
  });
});

describe('toInlineSql', () => {
  it('inlines and escapes values (single quotes doubled), ends with ;', () => {
    const sql = toInlineSql({ table: 't', where: [{ column: 'name', op: '=', value: "O'Brien" }] }, 'postgres');
    expect(sql).toContain(`"name" = 'O''Brien'`);
    expect(sql.endsWith(';')).toBe(true);
  });
});
