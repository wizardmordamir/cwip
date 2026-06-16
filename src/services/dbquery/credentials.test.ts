import { describe, expect, it } from 'bun:test';
import { clampCap, credentialEnvPrefix, DEFAULT_ROW_CAP, MAX_ROW_CAP, resolveCredentials, writesAllowed } from '.';

const env = (map: Record<string, string>) => (name: string) => map[name];

describe('credentialEnvPrefix', () => {
  it('uppercases and squashes non-alphanumerics', () => {
    expect(credentialEnvPrefix('prod-pg')).toBe('QB_PROD_PG');
    expect(credentialEnvPrefix('Stage db 2', 'RB')).toBe('RB_STAGE_DB_2');
  });
});

describe('resolveCredentials', () => {
  const conn = { envKey: 'prodpg', username: 'stored-user' };

  it('resolves URL/password/username from the injected env', () => {
    const creds = resolveCredentials(conn, {
      getEnv: env({ QB_PRODPG_PASSWORD: 'hunter2', QB_PRODPG_USERNAME: 'override' }),
    });
    expect(creds).toEqual({
      hasCredentials: true,
      url: undefined,
      username: 'override',
      password: 'hunter2',
      expectedEnv: ['QB_PRODPG_PASSWORD', 'QB_PRODPG_URL'],
    });
  });

  it('falls back to the stored username and reports missing credentials', () => {
    const creds = resolveCredentials(conn, { getEnv: env({}) });
    expect(creds.hasCredentials).toBe(false);
    expect(creds.username).toBe('stored-user');
  });

  it('a URL alone counts as credentials and a custom prefix changes the env names', () => {
    const creds = resolveCredentials(conn, {
      prefix: 'RB',
      getEnv: env({ RB_PRODPG_URL: 'postgres://x' }),
    });
    expect(creds.hasCredentials).toBe(true);
    expect(creds.url).toBe('postgres://x');
    expect(creds.expectedEnv).toEqual(['RB_PRODPG_PASSWORD', 'RB_PRODPG_URL']);
  });

  it('no envKey → no credentials, with guidance', () => {
    const creds = resolveCredentials({ envKey: '', username: 'u' }, { getEnv: env({}) });
    expect(creds.hasCredentials).toBe(false);
    expect(creds.expectedEnv[0]).toContain('env key');
  });
});

describe('writesAllowed', () => {
  it('requires BOTH the per-connection flag and the global env gate', () => {
    const on = env({ QB_ALLOW_WRITES: 'true' });
    expect(writesAllowed({ allowWrites: true }, { getEnv: on })).toBe(true);
    expect(writesAllowed({ allowWrites: false }, { getEnv: on })).toBe(false);
    expect(writesAllowed({ allowWrites: true }, { getEnv: env({}) })).toBe(false);
  });
});

describe('clampCap', () => {
  it('defaults junk and clamps to the max', () => {
    expect(clampCap(undefined)).toBe(DEFAULT_ROW_CAP);
    expect(clampCap(-5)).toBe(DEFAULT_ROW_CAP);
    expect(clampCap('250')).toBe(250);
    expect(clampCap(999_999)).toBe(MAX_ROW_CAP);
  });
});
