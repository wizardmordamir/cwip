import { describe, expect, it } from 'bun:test';
import { resolveSnCredentials, snWritesAllowed } from './credentials';

// A small env map injected via the getEnv option, so the test never touches process.env.
const getEnv = (map: Record<string, string>) => ({ getEnv: (name: string) => map[name] });

describe('resolveSnCredentials', () => {
  it('reports no credentials (and a hint) when the connection has no env key', () => {
    const out = resolveSnCredentials({ envKey: '', username: 'x' }, getEnv({}));
    expect(out.hasCredentials).toBe(false);
    expect(out.authKind).toBe('none');
    expect(out.expectedEnv[0]).toMatch(/env key/i);
  });

  it('prefers a token → bearer auth', () => {
    const out = resolveSnCredentials(
      { envKey: 'prod', username: 'admin' },
      getEnv({ SN_PROD_TOKEN: 'tok', SN_PROD_PASSWORD: 'pw' }),
    );
    expect(out.authKind).toBe('bearer');
    expect(out.token).toBe('tok');
    expect(out.hasCredentials).toBe(true);
  });

  it('falls back to password → basic auth, with username override', () => {
    const out = resolveSnCredentials(
      { envKey: 'prod', username: 'stored' },
      getEnv({ SN_PROD_PASSWORD: 'pw', SN_PROD_USERNAME: 'envuser' }),
    );
    expect(out.authKind).toBe('basic');
    expect(out.password).toBe('pw');
    expect(out.username).toBe('envuser');
  });

  it('uses the stored username when no env username is set', () => {
    const out = resolveSnCredentials({ envKey: 'prod', username: 'stored' }, getEnv({ SN_PROD_PASSWORD: 'pw' }));
    expect(out.username).toBe('stored');
  });

  it('exposes a URL override and normalizes the env-key prefix', () => {
    const out = resolveSnCredentials(
      { envKey: 'my-inst 2', username: '' },
      getEnv({ SN_MY_INST_2_URL: 'https://x.service-now.com', SN_MY_INST_2_TOKEN: 't' }),
    );
    expect(out.instanceUrlOverride).toBe('https://x.service-now.com');
    expect(out.authKind).toBe('bearer');
  });

  it('supports a custom prefix', () => {
    const out = resolveSnCredentials(
      { envKey: 'prod', username: 'x' },
      { prefix: 'SNOW', getEnv: (n) => ({ SNOW_PROD_TOKEN: 't' })[n] },
    );
    expect(out.authKind).toBe('bearer');
    expect(out.expectedEnv[0]).toBe('SNOW_PROD_TOKEN');
  });

  it('has no credentials when neither token nor password is present', () => {
    const out = resolveSnCredentials({ envKey: 'prod', username: 'x' }, getEnv({ SN_PROD_USERNAME: 'envuser' }));
    expect(out.hasCredentials).toBe(false);
    expect(out.authKind).toBe('none');
  });
});

describe('snWritesAllowed', () => {
  it('requires BOTH the per-connection opt-in AND the global env gate', () => {
    expect(snWritesAllowed(false, getEnv({ SN_ALLOW_WRITES: 'true' }))).toBe(false);
    expect(snWritesAllowed(true, getEnv({}))).toBe(false);
    expect(snWritesAllowed(true, getEnv({ SN_ALLOW_WRITES: 'false' }))).toBe(false);
    expect(snWritesAllowed(true, getEnv({ SN_ALLOW_WRITES: 'true' }))).toBe(true);
  });

  it('honors a custom prefix for the write gate', () => {
    expect(snWritesAllowed(true, { prefix: 'SNOW', getEnv: (n) => ({ SNOW_ALLOW_WRITES: 'true' })[n] })).toBe(true);
  });
});
