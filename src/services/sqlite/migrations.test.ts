import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, it } from 'bun:test';
import { addColumnIfMissing, columnExists, getColumnNames, tableExists } from './migrations';

let db: Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.run('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
});

describe('getColumnNames', () => {
  it('lists columns in declared order', () => {
    expect(getColumnNames(db, 'items')).toEqual(['id', 'name']);
  });

  it('returns [] for a table that does not exist', () => {
    expect(getColumnNames(db, 'missing')).toEqual([]);
  });

  it('rejects an invalid table identifier', () => {
    expect(() => getColumnNames(db, 'items; DROP TABLE items')).toThrow(/Invalid SQLite table/);
    expect(() => getColumnNames(db, 'bad-name')).toThrow(/Invalid SQLite table/);
    expect(() => getColumnNames(db, '1items')).toThrow(/Invalid SQLite table/);
  });
});

describe('tableExists', () => {
  it('is true for an existing table and false otherwise', () => {
    expect(tableExists(db, 'items')).toBe(true);
    expect(tableExists(db, 'nope')).toBe(false);
  });
});

describe('columnExists', () => {
  it('detects present and absent columns', () => {
    expect(columnExists(db, 'items', 'name')).toBe(true);
    expect(columnExists(db, 'items', 'created_at')).toBe(false);
  });

  it('is false when the table is absent', () => {
    expect(columnExists(db, 'missing', 'name')).toBe(false);
  });

  it('rejects an invalid column identifier', () => {
    expect(() => columnExists(db, 'items', 'name; DROP')).toThrow(/Invalid SQLite column/);
  });
});

describe('addColumnIfMissing', () => {
  it('adds a missing column and reports it', () => {
    expect(addColumnIfMissing(db, 'items', 'created_at', 'TEXT')).toBe(true);
    expect(columnExists(db, 'items', 'created_at')).toBe(true);
    // The column is usable, not just present in the catalogue.
    db.run("INSERT INTO items (name, created_at) VALUES ('a', '2026-01-01')");
    expect(db.query('SELECT created_at FROM items').get()).toEqual({ created_at: '2026-01-01' });
  });

  it('is a no-op (returns false) when the column already exists', () => {
    expect(addColumnIfMissing(db, 'items', 'name', 'TEXT')).toBe(false);
    expect(getColumnNames(db, 'items')).toEqual(['id', 'name']);
  });

  it('handles a reserved-word column (quotes the identifier)', () => {
    // `order` is a SQL keyword — an unquoted `ADD COLUMN order` would be a syntax
    // error, so the helper must quote it. PRAGMA still reports the unquoted name,
    // so the idempotency check holds on the next call.
    expect(addColumnIfMissing(db, 'items', 'order', 'INTEGER NOT NULL DEFAULT 0')).toBe(true);
    expect(getColumnNames(db, 'items')).toEqual(['id', 'name', 'order']);
    expect(addColumnIfMissing(db, 'items', 'order', 'INTEGER NOT NULL DEFAULT 0')).toBe(false);
  });

  it('is idempotent across repeated startups', () => {
    expect(addColumnIfMissing(db, 'items', 'tag', "TEXT NOT NULL DEFAULT ''")).toBe(true);
    expect(addColumnIfMissing(db, 'items', 'tag', "TEXT NOT NULL DEFAULT ''")).toBe(false);
    expect(addColumnIfMissing(db, 'items', 'tag', "TEXT NOT NULL DEFAULT ''")).toBe(false);
  });

  it('no-ops (returns false) when the table does not exist yet', () => {
    expect(addColumnIfMissing(db, 'not_created', 'x', 'TEXT')).toBe(false);
  });

  it('rejects an invalid column identifier without touching the table', () => {
    expect(() => addColumnIfMissing(db, 'items', 'x); DROP TABLE items; --', 'TEXT')).toThrow(/Invalid SQLite column/);
    expect(tableExists(db, 'items')).toBe(true);
  });
});
