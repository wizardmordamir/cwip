import { mock } from 'bun:test';
import { toMongoCall } from '../../services/db-mock/matchMongo';
import type { DbKind, DbMockRegistry } from '../../services/db-mock/types';

// Bun driver injection for cwip/db-mock. Replaces the pg / mysql2 / mssql /
// mongodb driver modules with thin fakes that route every query through a
// DbMockRegistry — so app code under test hits your handlers/fixtures instead of a
// real database, across multiple datasources at once. The matching + fixtures live
// in the runtime-agnostic `cwip/db-mock`; only this driver-level wiring is Bun-only.

export interface InstallDbMocksOptions {
  /**
   * Map an intercepted driver call to a datasource id. Default: the single
   * registered datasource of that kind (provide this when an app uses two DBs of
   * the same kind, routing on the connection config).
   */
  route?: (kind: DbKind, config: unknown) => string;
  /** Which drivers to intercept (default: all four). */
  drivers?: DbKind[];
}

const sqlText = (text: unknown): string =>
  typeof text === 'string'
    ? text
    : ((text as { text?: string; sql?: string })?.text ?? (text as { sql?: string })?.sql ?? '');
const sqlValues = (text: unknown, values: unknown): unknown[] =>
  (Array.isArray(values) ? values : (text as { values?: unknown[] })?.values) ?? [];

const installPg = (registry: DbMockRegistry, route: (c: unknown) => string): void => {
  class FakePg {
    config: unknown;
    constructor(config?: unknown) {
      this.config = config;
    }
    async connect(): Promise<this> {
      return this;
    }
    async end(): Promise<void> {}
    release(): void {}
    async query(
      text: unknown,
      values?: unknown,
    ): Promise<{ rows: unknown[]; rowCount: number; command: string; fields: unknown[] }> {
      const rows = await registry.resolveSql(route(this.config), sqlText(text), sqlValues(text, values));
      return { rows, rowCount: rows.length, command: '', fields: [] };
    }
  }
  mock.module('pg', () => ({ default: { Pool: FakePg, Client: FakePg }, Pool: FakePg, Client: FakePg }));
};

const installMysql = (registry: DbMockRegistry, route: (c: unknown) => string): void => {
  const makePool = (config: unknown) => {
    const query = async (sql: unknown, values?: unknown): Promise<[unknown[], unknown[]]> => {
      const rows = await registry.resolveSql(route(config), sqlText(sql), sqlValues(sql, values));
      return [rows, []];
    };
    return {
      query,
      execute: query,
      end: async () => {},
      getConnection: async () => ({ query, execute: query, release: () => {} }),
    };
  };
  const api = { createPool: makePool, createConnection: makePool };
  mock.module('mysql2/promise', () => ({ default: api, ...api }));
  mock.module('mysql2', () => ({ default: api, ...api }));
};

const installMssql = (registry: DbMockRegistry, route: (c: unknown) => string): void => {
  const makeRequest = (config: unknown) => {
    const req: Record<string, unknown> = {
      input: () => req,
      output: () => req,
      query: async (text: string) => {
        const recordset = await registry.resolveSql(route(config), text, []);
        return { recordset, recordsets: [recordset], rowsAffected: [recordset.length], output: {} };
      },
    };
    return req;
  };
  class ConnectionPool {
    config: unknown;
    constructor(config?: unknown) {
      this.config = config;
    }
    async connect(): Promise<this> {
      return this;
    }
    request(): Record<string, unknown> {
      return makeRequest(this.config);
    }
    async close(): Promise<void> {}
  }
  const api = {
    ConnectionPool,
    connect: async (c: unknown) => new ConnectionPool(c).connect(),
    Request: function Request() {
      return makeRequest(undefined);
    },
  };
  mock.module('mssql', () => ({ default: api, ...api }));
};

const installMongo = (registry: DbMockRegistry, route: (c: unknown) => string): void => {
  const arrayCursor = (get: () => Promise<unknown[]>) => {
    const cursor: Record<string, unknown> = {
      toArray: get,
      limit: () => cursor,
      sort: () => cursor,
      project: () => cursor,
      skip: () => cursor,
    };
    return cursor;
  };
  const makeCollection = (config: unknown, name: string) => {
    const call = (operation: string, args: unknown[]) =>
      registry.resolveMongo(route(config), toMongoCall(name, operation, args));
    return {
      find: (...a: unknown[]) => arrayCursor(async () => (await call('find', a)) as unknown[]),
      aggregate: (...a: unknown[]) => arrayCursor(async () => (await call('aggregate', a)) as unknown[]),
      findOne: (...a: unknown[]) => call('findOne', a),
      insertOne: (...a: unknown[]) => call('insertOne', a),
      insertMany: (...a: unknown[]) => call('insertMany', a),
      updateOne: (...a: unknown[]) => call('updateOne', a),
      updateMany: (...a: unknown[]) => call('updateMany', a),
      deleteOne: (...a: unknown[]) => call('deleteOne', a),
      deleteMany: (...a: unknown[]) => call('deleteMany', a),
      countDocuments: (...a: unknown[]) => call('countDocuments', a),
    };
  };
  class MongoClient {
    config: unknown;
    constructor(uri?: string, opts?: unknown) {
      this.config = { uri, opts };
    }
    async connect(): Promise<this> {
      return this;
    }
    async close(): Promise<void> {}
    on(): this {
      return this;
    }
    db(_name?: string) {
      return { collection: (coll: string) => makeCollection(this.config, coll), command: async () => ({ ok: 1 }) };
    }
  }
  class ObjectId {
    id?: string;
    constructor(id?: string) {
      this.id = id;
    }
    toString(): string {
      return this.id ?? '';
    }
  }
  mock.module('mongodb', () => ({ default: { MongoClient, ObjectId }, MongoClient, ObjectId }));
};

/**
 * Intercept the DB driver modules so every query routes through `registry`.
 * Call once in test setup (after registering datasources/fixtures):
 *
 *   const registry = createDbMockRegistry();
 *   registerFixtures(registry, loadFixtures('./__fixtures'));
 *   installDbMocks(registry);
 *   // now app code that imports pg/mysql2/mssql/mongodb gets mock rows
 */
export const installDbMocks = (registry: DbMockRegistry, options: InstallDbMocksOptions = {}): void => {
  const drivers = options.drivers ?? (['postgres', 'mysql', 'mssql', 'mongodb'] as DbKind[]);
  const routeFor =
    (kind: DbKind) =>
    (config: unknown): string => {
      if (options.route) return options.route(kind, config);
      const matches = registry.list().filter((d) => d.kind === kind);
      if (matches.length === 0) throw new Error(`installDbMocks: no ${kind} datasource registered`);
      return matches[0].id;
    };

  if (drivers.includes('postgres')) installPg(registry, routeFor('postgres'));
  if (drivers.includes('mysql')) installMysql(registry, routeFor('mysql'));
  if (drivers.includes('mssql')) installMssql(registry, routeFor('mssql'));
  if (drivers.includes('mongodb')) installMongo(registry, routeFor('mongodb'));
};
