// cwip/db-mock — a multi-config, multi-database mock layer. Register any number
// of datasources (two SQL dialects, SQL + Mongo together, …); each routes queries
// to handlers matched by normalized SQL keyword-sequence or Mongo collection+op.
// Handlers can be hand-written or generated from FIXTURES captured off a real DB
// (run → sanitize → replay), and the same fixtures double as input for type
// generation (see cwip/shape). The core is runtime-agnostic; the Bun driver
// injection that wires pg/mysql2/mssql/mongodb through a registry lives in
// cwip/testing (`installDbMocks`).

export type DbKind = 'postgres' | 'mysql' | 'mssql' | 'mongodb';
export type SqlKind = Exclude<DbKind, 'mongodb'>;

/** Mutable per-datasource record store handlers can read/write for stateful tests. */
export type RecordStore = Record<string, unknown[]>;

export interface SqlMatchContext {
  sql: string;
  params: unknown[];
  records: RecordStore;
}

export interface SqlMockHandler {
  name?: string;
  /** A representative query; its normalized keyword-sequence + param count identify matches. */
  query: string;
  /** Produce the rows a matching query returns. */
  rows: (ctx: SqlMatchContext) => unknown[] | Promise<unknown[]>;
}

/** A normalized Mongo call the matcher dispatches on. */
export interface MongoCallArgs {
  collection: string;
  operation: string;
  filter?: unknown;
  doc?: unknown;
  update?: unknown;
  pipeline?: unknown[];
  /** The raw positional args as the driver received them. */
  args: unknown[];
}

export interface MongoMatchContext {
  call: MongoCallArgs;
  records: RecordStore;
}

export interface MongoMockHandler {
  name?: string;
  collection: string;
  operation: string;
  /** Optional predicate to disambiguate when several handlers share collection+operation. */
  when?: (call: MongoCallArgs) => boolean;
  /** Produce the result a matching call returns (rows for find, a doc for findOne, etc.). */
  result: (ctx: MongoMatchContext) => unknown | Promise<unknown>;
}

export interface DbMockDatasource {
  /** Stable id used to route (e.g. `mainPg`, `analyticsMongo`). */
  id: string;
  kind: DbKind;
  /** Seed/mutable records handlers can read & mutate. */
  records?: RecordStore;
  sql?: SqlMockHandler[];
  mongo?: MongoMockHandler[];
  /** Throw on an unmatched query instead of returning an empty result (default false). */
  throwOnNoMatch?: boolean;
}

export interface DbMockRegistry {
  register(ds: DbMockDatasource): void;
  get(id: string): DbMockDatasource | undefined;
  list(): DbMockDatasource[];
  /** Run a SQL query against datasource `id`, returning matched rows. */
  resolveSql(id: string, sql: string, params?: unknown[]): Promise<unknown[]>;
  /** Run a Mongo call against datasource `id`, returning the matched result. */
  resolveMongo(id: string, call: MongoCallArgs): Promise<unknown>;
  /** Append handlers (e.g. built from fixtures) to an existing datasource. */
  addSqlHandlers(id: string, handlers: SqlMockHandler[]): void;
  addMongoHandlers(id: string, handlers: MongoMockHandler[]): void;
}

/**
 * A captured-and-editable DB interaction. Persisted as JSON you can hand-edit to
 * remove private data, then replayed as a mock (`registerFixtures`). The
 * `inputSample` + `result` fields also feed type generation (`fixtureTypes`).
 */
export interface DbFixture {
  /** Stable name (also the basis for a TS type name). */
  id: string;
  /** Datasource id this belongs to. */
  datasource: string;
  kind: DbKind;
  /** SQL text, or `collection.operation` for mongo. */
  operation: string;
  /** SQL params, or the positional mongo args. */
  params?: unknown[];
  /** A representative named-input sample (for input type generation). */
  inputSample?: unknown;
  /** The captured rows/docs (sanitized) — the mock response + output type sample. */
  result: unknown[];
  capturedAt?: string;
  meta?: Record<string, unknown>;
}
