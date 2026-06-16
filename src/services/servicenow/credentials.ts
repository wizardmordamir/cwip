import { credentialEnvPrefix } from '../dbquery/credentials';

/**
 * Credential resolution for user-saved ServiceNow connections. Like the query
 * builder's db connections, the secret NEVER lives in an app's DB — it comes from
 * the environment, keyed by a connection's `envKey`. For a connection with envKey
 * "PROD" (and the default 'SN' prefix) the server reads:
 *   SN_PROD_TOKEN     — an OAuth/bearer token (wins if set → Bearer auth)
 *   SN_PROD_PASSWORD  — the password (with SN_PROD_USERNAME / the stored username → Basic auth)
 *   SN_PROD_USERNAME  — overrides the stored username (optional)
 *   SN_PROD_URL       — overrides the stored instance URL (optional; lets the operator
 *                       keep even the instance host out of the DB)
 * Execution is allowed only when a token OR password is present, so an app can only
 * ever reach instances the operator has explicitly provisioned credentials for.
 *
 * `getEnv` is injectable so an app can layer a file-backed source under process.env
 * (e.g. rubato's ~/.rubato/.env); it defaults to process.env.
 */

export type SnAuthKind = 'bearer' | 'basic' | 'none';

export interface SnCredentialInput {
  envKey: string;
  username: string;
}

export interface SnResolvedCredentials {
  hasCredentials: boolean;
  authKind: SnAuthKind;
  token?: string;
  username?: string;
  password?: string;
  /** SN_<KEY>_URL, when set — overrides the connection's stored instance URL. */
  instanceUrlOverride?: string;
  /** The env var names the operator must set to enable execution (for error UX). */
  expectedEnv: string[];
}

export interface SnCredentialEnvOptions {
  /** Env-var prefix (default `'SN'`). */
  prefix?: string;
  /** Env lookup (default `process.env`). */
  getEnv?: (name: string) => string | undefined;
}

const defaultGetEnv = (name: string): string | undefined => process.env[name];

export const resolveSnCredentials = (
  conn: SnCredentialInput,
  options: SnCredentialEnvOptions = {},
): SnResolvedCredentials => {
  const getEnv = options.getEnv ?? defaultGetEnv;
  if (!conn.envKey) {
    return {
      hasCredentials: false,
      authKind: 'none',
      expectedEnv: ['(set an env key on the connection)'],
    };
  }
  const p = credentialEnvPrefix(conn.envKey, options.prefix ?? 'SN');
  const token = getEnv(`${p}_TOKEN`);
  const password = getEnv(`${p}_PASSWORD`);
  const username = getEnv(`${p}_USERNAME`) ?? conn.username;
  const instanceUrlOverride = getEnv(`${p}_URL`);
  const authKind: SnAuthKind = token ? 'bearer' : password ? 'basic' : 'none';
  return {
    hasCredentials: authKind !== 'none',
    authKind,
    token,
    username,
    password,
    instanceUrlOverride,
    expectedEnv: [`${p}_TOKEN`, `${p}_PASSWORD (+ ${p}_USERNAME)`],
  };
};

/**
 * Whether non-GET ServiceNow calls (creates/updates) may run: the per-connection
 * `allowWrites` opt-in AND a global `<PREFIX>_ALLOW_WRITES=true` env gate (mirrors the
 * query builder's QB_ALLOW_WRITES).
 */
export const snWritesAllowed = (allowWrites: boolean, options: SnCredentialEnvOptions = {}): boolean => {
  const getEnv = options.getEnv ?? defaultGetEnv;
  return allowWrites && getEnv(`${options.prefix ?? 'SN'}_ALLOW_WRITES`) === 'true';
};
