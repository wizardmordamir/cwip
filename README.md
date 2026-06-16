cwip
=========

A layered TypeScript utility toolbox: a **zero-dependency**, browser-safe core, with
opt-in subpaths for Node, databases, schema validation, Express, React, and a Bun test
toolkit. ESM-only and tree-shakeable (`"sideEffects": false`), so importing one function
ships only that function's code.

> Working on (or with an agent in) this package? [AGENTS.md](./AGENTS.md) is the dense,
> LLM-oriented map of every export — it ships in the package, so `node_modules/cwip/AGENTS.md`
> is readable after install.

## Installation

```sh
npm i cwip      # or: bun add cwip
```

The core (`cwip`, `cwip/node`) has **no required runtime dependencies**. A few subpaths
declare an **optional peer dependency** that you install only if you use that subpath
(see the table). Peers are loaded with a dynamic import *when the function runs* and throw
a clear "install X" error if missing — importing the subpath never pulls the peer in.

## Entry points

The package is split into **subpaths by runtime capability and dependency surface**, so a
browser consumer of `cwip` never resolves Node-, Bun-, or peer-only code. Import the
narrowest subpath — never a deep `dist/...` path.

| Import | Runtime | Peer dep | Contains |
| --- | --- | --- | --- |
| `cwip` | browser · Node · Bun | none | Pure JS utilities: array/object/string/date/math, `flow` (pipe/compose/curry), the `http` fetch client (`createApiClient`, SSE parsing, JWT decode, `joinUrl`), `logging`, `error`, `events`, `is`/`validation` predicates, `tabular` (CSV + row ops), `format`, `batch`/`cache`, `capture`, `bookmarks`. No `node:*` / `bun:*`. |
| `cwip/error` | browser · Node · Bun | none | `AppError` + the error-hook registry (also re-exported from the root). |
| `cwip/node` | Node · Bun | none¹ | Filesystem/path/dir helpers, env + JSON config loaders, a porcelain-free `git` toolkit, `node:crypto` secret box (`encryptSecret`/`deriveKey`), `obfuscate`, worker pool, graceful-shutdown manager, process crash handlers, `runWithTimeout` (spawn-with-timeout, SIGTERM→SIGKILL), shell/dns helpers, PDF text extraction. |
| `cwip/orchestration` | browser · Node · Bun | none | The canonical agent task-runner timing taxonomy + analytics (source of truth for the `orchlog` recorder's categories/groups): `CATEGORY_GROUPS`/`CATEGORY_KEYS`/`CATEGORY_LABELS`/`CATEGORY_COLORS`/`groupOf` (shared vocabulary + stable chart hues), the `TimingEvent` type + tolerant `parseTimingJsonl` (never throws; unknown category → 'other'), and the rollups `aggregateByCategory` (count/total/min/max/mean/median/p95 per category) / `summarize` (task/event counts, per-group totals, span) + `quantile`/`median`. |
| `cwip/build` | Node · Bun | none | Incremental build cache: `buildInputManifest` fingerprints a target's INPUT files (its tree + `extraDirs` like a symlinked `shared/` + root lockfile/tsconfig/`.env*`, excluding outputs/deps, never following symlinks) into a manifest; `checkBuildCache`/`diffManifests` skip a build when nothing changed (and force one when the output dir is gone). `runBuildCacheCli` (`check\|save\|clean`) sits behind a thin app wrapper; exported defaults let apps extend, not restate, the ignore lists. |
| `cwip/query` | browser · Node · Bun | none | SQL/Mongo query *construction*: `buildSelect`/`toInlineSql`, `buildMongoFind`/`toMongoShell`, `isReadOnlySql`/`assertReadOnlySql`. |
| `cwip/dbquery` | Node · Bun | `pg` · `mysql2` · `mssql` · `mongodb` (lazy)² | DB query *execution* + env-keyed credential resolution (no secrets in your app DB), row-cap/timeout, lazy drivers. |
| `cwip/db-mock` | Node · Bun | none | Multi-config, multi-database mock: `createDbMockRegistry` routes SQL (normalized keyword/param matching) + Mongo (collection/op) across many datasources; `recordFixture`/`loadFixtures`/`registerFixtures` capture real output → sanitize → replay; `fixtureTypes` derives input/response types via `cwip/shape`. The Bun driver injection is `installDbMocks` (in `cwip/testing`). |
| `cwip/sqlite` | Node · Bun | none | Framework-free SQLite schema helpers over a bun:sqlite-shaped handle (structural — cwip never imports a driver): idempotent additive migrations (`addColumnIfMissing`, `columnExists`/`tableExists`/`getColumnNames`, identifier-validated) + `applyRecommendedPragmas` (configurable WAL/synchronous/busy_timeout/wal_autocheckpoint/foreign_keys baseline). Lets a `CREATE TABLE IF NOT EXISTS` + `ALTER` DB-init read as schema, not bookkeeping. |
| `cwip/servicenow` | Node · Bun | none | ServiceNow REST client (table read/write + passthrough), credential resolver (`SN_<KEY>_*`), injectable fetch. |
| `cwip/env` | browser · Node · Bun | none | `.env` parse/serialize/compare behind the apps' ".env editor": `parseEnvFile`/`serializeEnv` round-trip a file (comments, blanks, `export`, quoting preserved), `parseEnvText` → key→value map, `upsertEnvVar`/`sortEnvEntries` edit, `diffEnvSets` builds a key×source matrix. Powers the `cwip/react` `EnvEditor`/`EnvCompare`; `cwip/node`'s `loadEnvFile` reuses its `parseEnvText`. |
| `cwip/excel` | Node · Bun | `xlsx` (lazy)² | `readWorkbook`/`readSheet`/`writeWorkbook` over `xlsx`. |
| `cwip/excel-engine` | Node · Bun | `exceljs`, `hyperformula` | Pure step engine for "excel automations": `applyStepToWorkbook` runs a declarative `AutomationStep` (keepSheet/filterRows/sortRows/filterColumns/addColumn/fillColumn/manualEdit) over an exceljs workbook; `buildRevisionView` renders a sheet for a data grid; `evalGroup`/`compareValues` (conditions), `evalFormulaColumn` (HyperFormula, GPLv3), `loadWorkbook`/`workbookToXlsxBytes`. No persistence/HTTP/UI — the app owns the revision store. |
| `cwip/excel-engine/types` | browser · Node · Bun | none | The **browser-safe** contract for the excel-engine: the `AutomationStep` union + `ColumnRef`/`Condition`/`RevisionView`/`StepResult`/`ExcelAutomation` types and the const arrays/labels a builder UI needs (`STEP_TYPES`/`STEP_TYPE_LABEL`, `COMPARISON_OPS`/`COMPARISON_OP_LABEL`, `UNARY_OPS`, `DATE_OPS`). No exceljs/hyperformula — import this from a UI; import the full `cwip/excel-engine` only server-side. |
| `cwip/health` | browser · Node · Bun | none | Framework-agnostic, pluggable health-check registry: `createHealthRegistry`/`runHealthChecks`/`summarizeHealth` yield a rich `{ status, detail, remediation }` report; `probeCheck`/`httpProbe` wrap a throwing probe (DB ping, HTTP) into a check. |
| `cwip/json` | browser · Node · Bun | none | Tolerant JSON / JS-object + CSV conversions behind the apps' JSON tools and the `cwip/react` `JsonEditor`: `parseLoose`/`formatJson` accept JS-isms (single quotes, unquoted keys, trailing commas, comments) and report line/col; `csvToJson`/`jsonToCsv`/`parseCsv`. |
| `cwip/layout` | browser · Node · Bun | none | The framework-agnostic layout/widget engine core behind designed list cards/detail/dashboards + custom pages: the v2 `LayoutNode` tree types + idempotent `migrateLayoutView`/`migrateLayoutConfig`, pure `treeOps` (add/remove/update/reorder/move) for an editor, `computeAggregate`/`computeDistribution`, the responsive 12-col grid + style-token class maps (`nodeGridClass`/`nodeBoxClass`/`nodeTextClass`), and the generic `LayoutField`/`LayoutRow` + `resolveBinding` contract. The React renderer/editor build on this in `cwip/react`; each app supplies its own widget registry + binding resolver. |
| `cwip/mongodb` | Node · Bun | `mongodb` (lazy)² | `connectMongo` with retry/backoff + pool-config parse. |
| `cwip/schema` | Node · Bun | `ajv` | `createAjv`/`compileSchema`/`validate`, `normalizeSchemaErrors`. |
| `cwip/shape` | browser · Node · Bun | none | Structural shape inference + a TS emitter: `inferShape`/`inferRowShape` derive a `ShapeNode` (types, optional/nullable, unions, nested, merged across samples) from real data; `shapeToTs`/`shapeToInterface` emit TypeScript. The seam under "capture data → mock it → generate types" (used by `cwip/db-mock` fixtures). |
| `cwip/search` | browser · Node · Bun | none | Pure helpers for a "universal content search" over an app's own data: `valueToText` flattens a stored value to searchable/display text, `buildSnippet`/`snippetForLabel` excerpt around a match, `jsonValuesMatch`/`firstMatchSnippet`/`firstNonEmptyValue` search a JSON column's values while EXCLUDING secret keys, `escapeLike`/`likePattern` build safe SQL LIKE patterns. The app owns its data sources + SQL; powers the `cwip/react` `SearchResults`. |
| `cwip/server` | Node · Bun | `express`, `cors`, `compression` (lazy) | `serveApp` (app + http server + graceful shutdown + listen) / `createApp` factory, `securityHeaders`, `corsWhitelist`, `requestLogger`, `addStaticSpa` (static + SPA fallback), `addHealthRoutes`, `errorHandler`/`notFoundHandler`. |
| `cwip/react` | browser | `react` | `ErrorBoundary` (+ `useErrorBoundary`/`withErrorBoundary`), `Spinner`, `Tooltip`, `Toast`/`ToastList`, `InfoHint`, `SecretInput` (masked field + eye reveal + copy) / `EnvEditor` / `EnvCompare` (over `cwip/env`), plus the `Button`/`Input`/etc. kit. Styled ones (and `cwip/layout`'s grid) are Tailwind-first — `@import "cwip/styles.css";`, or `@source` the **whole** `cwip/dist` (not just `dist/react`, which omits the layout grid classes) — with a uniform per-slot override API — `classNames`/`styles` (string/object merges, function replaces) + `unstyled` (`true` keeps positioning, `'all'` bare). See `./styling`: `StyleableProps`, `resolveClass`, `resolveStyle`, `cx`. The brand color is one themeable token (`--color-accent`); `Button`/`IconButton` take a `tooltip` and `FieldLabel` a `hint`. |
| `cwip/react/theme.css` | browser | — | Optional stylesheet that gives the `accent` brand token an emerald default, so a new app renders correctly with zero config: `@import "cwip/react/theme.css";`. Override `--color-accent`/`--color-accent-hover` (e.g. via `@theme inline` over a CSS var) to rebrand. |
| `cwip/test-report` | Node · Bun | none | The structured test-run report model + renderers (`createRunReport`, `renderReportText`/`renderReportHtml`, `summarizeReport`), JUnit parser (`parseJUnitXml`), fs writer with **debug-artifact** materialization (`writeReportFiles`), and a Node-safe report-dir reader (`readReportSummaries`/`readReport`/`resolveArtifactPath`). Importable by production servers (unlike Bun-only `cwip/testing`, which re-exports it). |
| `cwip/test-report/types` | browser · Node · Bun | none | The **browser-safe** report types (`TestRunReport`/`TestCaseResult`/`TestArtifact`/`TestRunSummary`/`TestStatus`) for a UI report viewer — no `node:fs`. |
| `cwip/e2e` | Node · Bun | `@playwright/test` (type-only) | Declarative, resilient browser-driving toolkit: `createE2E(config)` → named actions piped through `run(...)` (goTo/click/fill/expect…), a config-driven `resolveTarget` (test-id→role→text→css), auto debug-capture (screenshot/html/console/network) on failure. Playwright is type-only — actions take a `Page` you create. |
| `cwip/e2e/reporter` | Node · Bun | `@playwright/test` (type-only) | The `CwipPlaywrightReporter` (default export) — converts Playwright results + attachments into a `cwip/test-report` `TestRunReport` so E2E runs land in the same reports dir/viewer as functional runs. |
| `cwip/testing` | **Bun test only** | none (uses `bun:test`) | Test toolkit: `startTestServer`, `makeHttpTestClient`, `isolateEnvDir`/`makeTempDir`, fixtures, schema assertions (`expectMatchObjectBySchema`), `createPendingFileOperations`, the `installDbMocks` Bun driver injection, fs/console mocks. Re-exports `cwip/test-report` + `cwip/db-mock`. |

¹ `cwip/node`'s `extractPdfText` lazy-loads the optional `unpdf` peer only when called.
² *Lazy* peers are dynamically imported the first time you call the function that needs them — so you install only the driver(s) you actually use.

```ts
import { pipe, createApiClient, isString } from 'cwip';          // anywhere
import { loadEnvFile, git, runWithTimeout } from 'cwip/node';      // Node / Bun
import { runBuildCacheCli } from 'cwip/build';                    // incremental build cache
import { buildSelect } from 'cwip/query';                         // query construction
import { connectMongo } from 'cwip/mongodb';                      // needs `mongodb` installed
import { createApp, securityHeaders } from 'cwip/server';         // needs `express` + `cors`
import { ErrorBoundary, Toast } from 'cwip/react';                // needs `react`
import { startTestServer } from 'cwip/testing';                   // Bun tests only
```

## The zero-dependency guarantee

`cwip` and `cwip/node` pull in **nothing** at install or runtime. Heavier capabilities
live behind their own subpath and declare their external as an **optional peer
dependency** — you install it; cwip never bundles it. A guard test asserts the
browser-safe core never imports a peer, so the guarantee can't silently regress.

## Usage

Each utility has a co-located `*.test.ts` next to it (e.g. `src/array/chunk.test.ts`) that
doubles as a usage example. [AGENTS.md](./AGENTS.md) lists every export by subpath.

## Testing utilities (Bun)

`cwip/testing` provides reusable mocks and a real-server test harness so consumers don't
re-implement `fs`/`console` mocking or server spin-up in every project. It uses
[`bun:test`](https://bun.sh/docs/cli/test) and is therefore only available under Bun.

```ts
// some.test.ts — run with `bun test`
import { beforeEach, expect, it } from 'bun:test';
import { initializeGlobalMocks, fake, fakeReject, resetAllMocks } from 'cwip/testing';

const { registry } = initializeGlobalMocks(); // replaces console/fs.* with mocks for the suite

beforeEach(() => resetAllMocks());

it('mocks an external async call by dotted path', async () => {
  fake('fs.promises.readFile', 'pretend file contents');      // override resolved value
  fakeReject('fs.promises.writeFile', new Error('disk full')); // force a rejection
  // ...exercise the system under test that calls fs.promises.*
});
```

Also exported: `startTestServer`, `makeHttpTestClient`, `isolateEnvDir`/`makeTempDir`,
`defineFixture`/`seqId`, run-report builders, `parseJUnitXml`, and the
`makeMockApp`/`makeMockLogger`/`makeMockReq`/`makeMockRes`/`mockMongoDB` factories.

### Why a separate entry point?

`bun:test` only exists inside the Bun test runtime. Keeping these helpers behind
`cwip/testing` means browser and plain-Node consumers of `cwip` / `cwip/node` never
resolve `bun:test`, so they can't be broken by it. Under the hood the package's `"bun"`
export condition routes Bun to the real module and every other runtime to a stub that
throws a clear "requires the Bun runtime" error at import time.

## License

ISC
