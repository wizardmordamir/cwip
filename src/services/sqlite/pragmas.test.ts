import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, it } from 'bun:test';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyRecommendedPragmas } from './pragmas';

// Read a single-value PRAGMA (the row key varies — `busy_timeout` reports under
// `timeout`), so just take the first column.
const pragma = (db: Database, name: string): unknown => {
  const row = db.query(`PRAGMA ${name}`).get() as Record<string, unknown> | null;
  return row ? Object.values(row)[0] : undefined;
};

describe('applyRecommendedPragmas (in-memory)', () => {
  let db: Database;
  afterEach(() => db?.close());

  it('applies the recommended baseline by default', () => {
    db = new Database(':memory:');
    applyRecommendedPragmas(db);
    expect(pragma(db, 'synchronous')).toBe(1); // NORMAL
    expect(pragma(db, 'busy_timeout')).toBe(5000);
    expect(pragma(db, 'foreign_keys')).toBe(0); // OFF by default
  });

  it('enforces foreign keys when asked', () => {
    db = new Database(':memory:');
    applyRecommendedPragmas(db, { foreignKeys: true });
    expect(pragma(db, 'foreign_keys')).toBe(1);
  });

  it('honours custom values', () => {
    db = new Database(':memory:');
    applyRecommendedPragmas(db, { busyTimeout: 250, synchronous: 'FULL' });
    expect(pragma(db, 'busy_timeout')).toBe(250);
    expect(pragma(db, 'synchronous')).toBe(2); // FULL
  });

  it('skips a pragma set to null', () => {
    db = new Database(':memory:');
    applyRecommendedPragmas(db, { busyTimeout: null });
    expect(pragma(db, 'busy_timeout')).toBe(0); // untouched (driver default)
  });

  it('rejects a non-integer numeric pragma', () => {
    db = new Database(':memory:');
    expect(() => applyRecommendedPragmas(db, { busyTimeout: 5.5 })).toThrow(/must be an integer/);
  });
});

describe('applyRecommendedPragmas (file-backed)', () => {
  it('actually switches the journal mode to WAL', () => {
    // WAL is unsupported on :memory:, so verify it against a real file.
    const path = join(tmpdir(), `cwip-sqlite-pragma-${process.pid}-${Date.now()}.sqlite`);
    const db = new Database(path);
    try {
      applyRecommendedPragmas(db);
      expect(pragma(db, 'journal_mode')).toBe('wal');
    } finally {
      db.close();
      for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
    }
  });
});
