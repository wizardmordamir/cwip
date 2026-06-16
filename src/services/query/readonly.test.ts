import { describe, expect, it } from 'bun:test';
import { assertReadOnlySql, isReadOnlySql, WriteQueryBlockedError } from './readonly';

describe('isReadOnlySql', () => {
  it('allows SELECT and WITH … SELECT (incl. trailing ;)', () => {
    expect(isReadOnlySql('SELECT * FROM users')).toBe(true);
    expect(isReadOnlySql('select id from t where x = 1;')).toBe(true);
    expect(isReadOnlySql('WITH c AS (SELECT 1) SELECT * FROM c')).toBe(true);
  });

  it('blocks mutations and DDL', () => {
    for (const sql of [
      'DELETE FROM users',
      'UPDATE users SET x=1',
      'INSERT INTO t VALUES (1)',
      'DROP TABLE t',
      'TRUNCATE t',
      'ALTER TABLE t ADD c int',
      'CREATE TABLE t (id int)',
      'GRANT ALL ON t TO bob',
    ]) {
      expect(isReadOnlySql(sql)).toBe(false);
    }
  });

  it('blocks SELECT … INTO (it writes a new table)', () => {
    expect(isReadOnlySql('SELECT * INTO copy FROM users')).toBe(false);
  });

  it('blocks stacked statements and comment-smuggled writes', () => {
    expect(isReadOnlySql('SELECT 1; DROP TABLE t')).toBe(false);
    expect(isReadOnlySql('SELECT 1 -- ;\n; DELETE FROM t')).toBe(false);
    expect(isReadOnlySql('SELECT 1 /* hi */ ; UPDATE t SET x=1')).toBe(false);
  });

  it('rejects empty / non-select input', () => {
    expect(isReadOnlySql('')).toBe(false);
    expect(isReadOnlySql('   ')).toBe(false);
    expect(isReadOnlySql('EXEC sp_who')).toBe(false);
  });
});

describe('assertReadOnlySql', () => {
  it('throws WriteQueryBlockedError on a write', () => {
    expect(() => assertReadOnlySql('DELETE FROM t')).toThrow(WriteQueryBlockedError);
    expect(() => assertReadOnlySql('SELECT 1')).not.toThrow();
  });
});
