import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaptureRecord } from '../../core/capture';
import { inferRowShape, inferShape } from '../../data/shape/inferShape';
import { shapeToInterface } from '../../data/shape/shapeToTs';
import type { DbFixture, DbMockRegistry, MongoMockHandler, SqlMockHandler } from './types';

const asRows = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

const pascal = (s: string): string =>
  s
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') || 'Fixture';

// ── replay: fixtures → handlers ─────────────────────────────────────────────────

/** Build a SQL mock handler that replays a fixture's captured rows. */
export const fixtureToSqlHandler = (fixture: DbFixture): SqlMockHandler => ({
  name: fixture.id,
  query: fixture.operation,
  rows: () => fixture.result,
});

/** Build a Mongo mock handler from a fixture whose `operation` is `collection.op`. */
export const fixtureToMongoHandler = (fixture: DbFixture): MongoMockHandler => {
  const [collection, operation = 'find'] = fixture.operation.split('.');
  return {
    name: fixture.id,
    collection,
    operation,
    result: () => (operation === 'find' || operation === 'aggregate' ? fixture.result : (fixture.result[0] ?? null)),
  };
};

/**
 * Register captured fixtures as replay handlers on a registry, grouped by
 * datasource. Missing datasources are auto-created with the fixture's kind, so a
 * directory of captured-and-sanitized fixtures becomes a working multi-DB mock in
 * one call.
 */
export const registerFixtures = (registry: DbMockRegistry, fixtures: DbFixture[]): void => {
  const byDatasource = new Map<string, DbFixture[]>();
  for (const f of fixtures) {
    const list = byDatasource.get(f.datasource) ?? [];
    list.push(f);
    byDatasource.set(f.datasource, list);
  }
  for (const [datasource, list] of byDatasource) {
    if (!registry.get(datasource)) registry.register({ id: datasource, kind: list[0].kind });
    const sql = list.filter((f) => f.kind !== 'mongodb').map(fixtureToSqlHandler);
    const mongo = list.filter((f) => f.kind === 'mongodb').map(fixtureToMongoHandler);
    if (sql.length) registry.addSqlHandlers(datasource, sql);
    if (mongo.length) registry.addMongoHandlers(datasource, mongo);
  }
};

// ── persistence ─────────────────────────────────────────────────────────────────

/** Write a fixture to `<dir>/<id>.json` (created if missing). Hand-edit it to scrub PII. */
export const saveFixture = (dir: string, fixture: DbFixture): string => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${fixture.id}.json`);
  writeFileSync(file, JSON.stringify(fixture, null, 2));
  return file;
};

/** Load every fixture under a directory (each file is a `DbFixture` or an array of them). */
export const loadFixtures = (dir: string): DbFixture[] => {
  if (!existsSync(dir)) return [];
  const out: DbFixture[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      for (const fx of Array.isArray(parsed) ? parsed : [parsed]) out.push(fx as DbFixture);
    } catch {
      // skip unreadable/corrupt fixture files
    }
  }
  return out;
};

// ── capture → fixtures ──────────────────────────────────────────────────────────

/**
 * Convert cwip capture records (from `captureQuery`, kind `'db'`) into fixtures —
 * the bridge from "I logged real queries" to "replay them as mocks". Provide the
 * `datasource`/`kind`; `getRows` extracts rows from each record's response
 * (defaults to the response itself or its `.rows`).
 */
export const fromCaptureRecords = (
  records: CaptureRecord[],
  opts: { datasource: string; kind: DbFixture['kind']; getRows?: (r: CaptureRecord) => unknown[] },
): DbFixture[] =>
  records
    .filter((r) => r.kind === 'db' && r.response !== undefined)
    .map((r, i) => {
      const req = r.request as { sql?: string; params?: unknown[] } | undefined;
      const getRows = opts.getRows ?? ((rec) => asRows((rec.response as { rows?: unknown[] })?.rows ?? rec.response));
      return {
        id: `${r.label}-${i}`,
        datasource: opts.datasource,
        kind: opts.kind,
        operation: req?.sql ?? r.label,
        ...(req?.params && { params: req.params, inputSample: req.params }),
        result: getRows(r),
        capturedAt: r.timestamp,
      } satisfies DbFixture;
    });

// ── record: real run → fixture ──────────────────────────────────────────────────

export interface RecordFixtureSpec {
  id: string;
  datasource: string;
  kind: DbFixture['kind'];
  /** SQL text (a placeholder template matches best) or `collection.operation`. */
  operation: string;
  params?: unknown[];
  inputSample?: unknown;
  meta?: Record<string, unknown>;
}

export interface RecordFixtureOptions {
  /** Scrub/anonymize the captured fixture before it's returned/saved. */
  sanitize?: (fixture: DbFixture) => DbFixture;
  /** If set, persist the (sanitized) fixture here. */
  dir?: string;
  now?: () => string;
}

/**
 * Run a real query and capture its output as a (sanitized) fixture — the
 * "record real data, edit out private bits, replay as a mock" loop. `run` does the
 * real call (e.g. `cwip/dbquery`'s `runSqlByDialect`/`runMongo`, returning rows).
 *
 *   const fx = await recordFixture(
 *     { id: 'active-users', datasource: 'mainPg', kind: 'postgres', operation: SQL, params },
 *     () => runSqlByDialect(conn, creds, inlinedSql, 500).then((r) => r.rows),
 *     { dir: './__fixtures', sanitize: (f) => ({ ...f, result: f.result.map(stripEmail) }) },
 *   );
 */
export const recordFixture = async (
  spec: RecordFixtureSpec,
  run: () => Promise<unknown> | unknown,
  options: RecordFixtureOptions = {},
): Promise<DbFixture> => {
  const result = asRows(await run());
  const fixture: DbFixture = {
    ...spec,
    result,
    capturedAt: options.now?.() ?? new Date().toISOString(),
  };
  const finalized = options.sanitize ? options.sanitize(fixture) : fixture;
  if (options.dir) saveFixture(options.dir, finalized);
  return finalized;
};

// ── type generation seam ─────────────────────────────────────────────────────────

export interface FixtureTypeOptions {
  inputName?: string;
  outputName?: string;
}

/**
 * Derive TypeScript types for a fixture: a `*Row` interface from the captured
 * result and (when present) an `*Input` interface from `inputSample`. The bridge
 * to a JSON/CSV→TS dev tool — capture a query once, get both its input and
 * response types for the repo. Built on `cwip/shape`.
 */
export const fixtureTypes = (fixture: DbFixture, opts: FixtureTypeOptions = {}): { output: string; input?: string } => {
  const output = shapeToInterface(opts.outputName ?? `${pascal(fixture.id)}Row`, inferRowShape(fixture.result));
  if (fixture.inputSample === undefined) return { output };
  const input = shapeToInterface(opts.inputName ?? `${pascal(fixture.id)}Input`, inferShape(fixture.inputSample));
  return { output, input };
};
