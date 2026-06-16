import type { SqlDialect } from '../query';

/**
 * Credential resolution for user-saved database connections. Secrets NEVER live
 * in an app's DB — they come from the environment, keyed by a connection's
 * `envKey`. For a connection with envKey "PRODPG" (and the default 'QB' prefix)
 * the server reads:
 *   QB_PRODPG_URL       — a full connection string/URI (wins if set; ideal for mongo)
 *   QB_PRODPG_PASSWORD  — the password (assembled with host/port/db/username otherwise)
 *   QB_PRODPG_USERNAME  — overrides the stored username (optional)
 * Execution is allowed only when a URL or PASSWORD is present — so an app can
 * only ever reach databases the operator has explicitly provisioned
 * credentials for. Promoted from cursedalchemy's query builder.
 */

/** A saved connection (no password — see `resolveCredentials`). */
export interface ConnectionRecord {
  id: string;
  dialect: SqlDialect | 'mongodb';
  host: string;
  port: number | null;
  database: string;
  username: string;
  ssl: boolean;
  envKey: string;
  allowWrites: boolean;
}

export interface ResolvedCredentials {
  hasCredentials: boolean;
  url?: string;
  username?: string;
  password?: string;
  /** The env var names the operator must set to enable execution (for error UX). */
  expectedEnv: string[];
}

export interface CredentialEnvOptions {
  /** Env-var prefix (default `'QB'`). */
  prefix?: string;
  /**
   * Env lookup (default `process.env`). Inject to add file-backed sources,
   * e.g. an app's `~/.app/.env` map layered under the process env.
   */
  getEnv?: (name: string) => string | undefined;
}

const defaultGetEnv = (name: string): string | undefined => process.env[name];

/** Normalize an envKey into the `<PREFIX>_<KEY>_` form (uppercase, non-alphanumeric → _). */
export const credentialEnvPrefix = (envKey: string, prefix = 'QB'): string =>
  `${prefix}_${envKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;

export const resolveCredentials = (
  conn: Pick<ConnectionRecord, 'envKey' | 'username'>,
  options: CredentialEnvOptions = {},
): ResolvedCredentials => {
  const getEnv = options.getEnv ?? defaultGetEnv;
  if (!conn.envKey) {
    return { hasCredentials: false, expectedEnv: ['(set an env key on the connection)'] };
  }
  const p = credentialEnvPrefix(conn.envKey, options.prefix);
  const url = getEnv(`${p}_URL`);
  const password = getEnv(`${p}_PASSWORD`);
  const username = getEnv(`${p}_USERNAME`) ?? conn.username;
  return {
    hasCredentials: Boolean(url || password),
    url,
    username,
    password,
    expectedEnv: [`${p}_PASSWORD`, `${p}_URL`],
  };
};

/** Whether non-SELECT queries may run: per-connection opt-in AND a global `<PREFIX>_ALLOW_WRITES` env gate. */
export const writesAllowed = (
  conn: Pick<ConnectionRecord, 'allowWrites'>,
  options: CredentialEnvOptions = {},
): boolean => {
  const getEnv = options.getEnv ?? defaultGetEnv;
  return conn.allowWrites && getEnv(`${options.prefix ?? 'QB'}_ALLOW_WRITES`) === 'true';
};
