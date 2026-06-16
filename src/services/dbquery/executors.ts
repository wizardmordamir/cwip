import type { ConnectionRecord, ResolvedCredentials } from './credentials';

/**
 * Per-dialect query executors. Drivers (pg / mysql2 / mssql / mongodb) are
 * optional peers imported LAZILY inside each runner, so: (a) a missing or
 * runtime-incompatible driver never breaks app boot — it only fails the one
 * execution with a clean message; (b) the heavy modules load only when someone
 * actually runs a query. Every runner enforces a row cap + timeout and always
 * closes its connection. Build queries with `cwip/query` (`buildSql`,
 * `buildMongoFind`, `assertReadOnlySql`); execute them here.
 */

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

export const DEFAULT_ROW_CAP = 500;
export const MAX_ROW_CAP = 5000;
export const DEFAULT_TIMEOUT_MS = 15_000;

/** Clamp a requested row cap into (0, MAX_ROW_CAP], defaulting junk to DEFAULT_ROW_CAP. */
export const clampCap = (n: unknown): number => {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v) || v <= 0) {
    return DEFAULT_ROW_CAP;
  }
  return Math.min(v, MAX_ROW_CAP);
};

const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const loadDriver = async (mod: string): Promise<any> => {
  try {
    return await import(mod);
  } catch (err) {
    throw new Error(`The "${mod}" driver isn't available on the server (${(err as Error).message}).`);
  }
};

const columnsFromRows = (rows: Record<string, unknown>[]): string[] => {
  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      seen.add(k);
    }
  }
  return [...seen];
};

const capRows = (all: Record<string, unknown>[], cap: number) => ({
  rows: all.slice(0, cap),
  rowCount: Math.min(all.length, cap),
  truncated: all.length > cap,
});

// ── SQL ────────────────────────────────────────────────────────────────────────

const runPostgres = async (
  conn: ConnectionRecord,
  creds: ResolvedCredentials,
  sql: string,
  cap: number,
): Promise<QueryResult> => {
  const pg = await loadDriver('pg');
  const Client = pg.Client ?? pg.default?.Client;
  const ssl = conn.ssl ? { rejectUnauthorized: false } : undefined;
  const client = creds.url
    ? new Client({ connectionString: creds.url, ssl, statement_timeout: DEFAULT_TIMEOUT_MS })
    : new Client({
        host: conn.host,
        port: conn.port ?? 5432,
        database: conn.database,
        user: creds.username,
        password: creds.password,
        ssl,
        statement_timeout: DEFAULT_TIMEOUT_MS,
        connectionTimeoutMillis: DEFAULT_TIMEOUT_MS,
      });
  const started = Date.now();
  try {
    await withTimeout(client.connect(), DEFAULT_TIMEOUT_MS, 'connect');
    const result = await withTimeout<any>(client.query(sql), DEFAULT_TIMEOUT_MS, 'query');
    const all = (result.rows ?? []) as Record<string, unknown>[];
    const columns = result.fields?.length ? result.fields.map((f: any) => f.name) : columnsFromRows(all);
    return { columns, ...capRows(all, cap), durationMs: Date.now() - started };
  } finally {
    await client.end().catch(() => undefined);
  }
};

const runMysql = async (
  conn: ConnectionRecord,
  creds: ResolvedCredentials,
  sql: string,
  cap: number,
): Promise<QueryResult> => {
  const mysql = (await loadDriver('mysql2/promise')).default ?? (await loadDriver('mysql2/promise'));
  const connection = await withTimeout<any>(
    creds.url
      ? mysql.createConnection(creds.url)
      : mysql.createConnection({
          host: conn.host,
          port: conn.port ?? 3306,
          database: conn.database,
          user: creds.username,
          password: creds.password,
          ssl: conn.ssl ? {} : undefined,
          connectTimeout: DEFAULT_TIMEOUT_MS,
        }),
    DEFAULT_TIMEOUT_MS,
    'connect',
  );
  const started = Date.now();
  try {
    const [rows, fields] = await withTimeout<any>(connection.query(sql), DEFAULT_TIMEOUT_MS, 'query');
    const all = (Array.isArray(rows) ? rows : []) as Record<string, unknown>[];
    const columns = Array.isArray(fields) && fields.length ? fields.map((f: any) => f.name) : columnsFromRows(all);
    return { columns, ...capRows(all, cap), durationMs: Date.now() - started };
  } finally {
    await connection.end().catch(() => undefined);
  }
};

const runMssql = async (
  conn: ConnectionRecord,
  creds: ResolvedCredentials,
  sql: string,
  cap: number,
): Promise<QueryResult> => {
  const mssql = (await loadDriver('mssql')).default ?? (await loadDriver('mssql'));
  const pool = new mssql.ConnectionPool(
    creds.url ?? {
      server: conn.host,
      port: conn.port ?? 1433,
      database: conn.database,
      user: creds.username,
      password: creds.password,
      options: { encrypt: conn.ssl, trustServerCertificate: true },
      connectionTimeout: DEFAULT_TIMEOUT_MS,
      requestTimeout: DEFAULT_TIMEOUT_MS,
    },
  );
  const started = Date.now();
  try {
    await withTimeout(pool.connect(), DEFAULT_TIMEOUT_MS, 'connect');
    const result = await withTimeout<any>(pool.request().query(sql), DEFAULT_TIMEOUT_MS, 'query');
    const all = (result.recordset ?? []) as Record<string, unknown>[];
    const columns = result.recordset?.columns ? Object.keys(result.recordset.columns) : columnsFromRows(all);
    return { columns, ...capRows(all, cap), durationMs: Date.now() - started };
  } finally {
    await pool.close().catch(() => undefined);
  }
};

export const runSqlByDialect = async (
  conn: ConnectionRecord,
  creds: ResolvedCredentials,
  sql: string,
  cap: number,
): Promise<QueryResult> => {
  if (conn.dialect === 'postgres') {
    return runPostgres(conn, creds, sql, cap);
  }
  if (conn.dialect === 'mysql') {
    return runMysql(conn, creds, sql, cap);
  }
  if (conn.dialect === 'mssql') {
    return runMssql(conn, creds, sql, cap);
  }
  throw new Error(`Not a SQL dialect: ${conn.dialect}`);
};

// ── Mongo ────────────────────────────────────────────────────────────────────────

export interface MongoRunInput {
  collection: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
}

const buildMongoUri = (conn: ConnectionRecord, creds: ResolvedCredentials): string => {
  const cred =
    creds.username && creds.password
      ? `${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@`
      : '';
  const port = conn.port ? `:${conn.port}` : '';
  return `mongodb://${cred}${conn.host}${port}/${conn.database}`;
};

export const runMongo = async (
  conn: ConnectionRecord,
  creds: ResolvedCredentials,
  input: MongoRunInput,
  cap: number,
): Promise<QueryResult> => {
  const mongodb = await loadDriver('mongodb');
  const MongoClient = mongodb.MongoClient ?? mongodb.default?.MongoClient;
  const client = new MongoClient(creds.url ?? buildMongoUri(conn, creds), {
    serverSelectionTimeoutMS: DEFAULT_TIMEOUT_MS,
  });
  const started = Date.now();
  try {
    await withTimeout(client.connect(), DEFAULT_TIMEOUT_MS, 'connect');
    const cursor = client
      .db(conn.database)
      .collection(input.collection)
      .find(input.filter ?? {}, {
        projection: input.projection,
        sort: input.sort,
        skip: input.skip,
      })
      .limit(cap + 1); // fetch one extra to detect truncation
    const all = (await withTimeout(cursor.toArray(), DEFAULT_TIMEOUT_MS, 'query')) as Record<string, unknown>[];
    const capped = capRows(all, cap);
    return { columns: columnsFromRows(capped.rows), ...capped, durationMs: Date.now() - started };
  } finally {
    await client.close().catch(() => undefined);
  }
};
