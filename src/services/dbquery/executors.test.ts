import { describe, expect, it } from 'bun:test';
import { type ConnectionRecord, type ResolvedCredentials, runSqlByDialect } from '.';

const conn = (dialect: ConnectionRecord['dialect']): ConnectionRecord => ({
  id: 'c1',
  dialect,
  host: 'db.example.com',
  port: null,
  database: 'app',
  username: 'reader',
  ssl: false,
  envKey: 'TEST',
  allowWrites: false,
});

const creds: ResolvedCredentials = {
  hasCredentials: true,
  password: 'hunter2',
  username: 'reader',
  expectedEnv: [],
};

describe('runSqlByDialect', () => {
  it('a missing driver fails that run with a clean message naming the module', async () => {
    // None of the SQL drivers are installed in cwip's own test env — the lazy
    // import is the point: app boot never needs them, only an actual run does.
    await expect(runSqlByDialect(conn('postgres'), creds, 'SELECT 1', 10)).rejects.toThrow(/"pg" driver/);
    await expect(runSqlByDialect(conn('mysql'), creds, 'SELECT 1', 10)).rejects.toThrow(/"mysql2\/promise" driver/);
    await expect(runSqlByDialect(conn('mssql'), creds, 'SELECT 1', 10)).rejects.toThrow(/"mssql" driver/);
  });

  it('rejects a non-SQL dialect', async () => {
    await expect(runSqlByDialect(conn('mongodb'), creds, 'SELECT 1', 10)).rejects.toThrow(/Not a SQL dialect/);
  });
});
