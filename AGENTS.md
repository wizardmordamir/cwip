# cwip — agent / LLM reference

**Read this file first** when working in (or on an app that depends on) `cwip`. It is
a map of everything the package offers so you can reach for an existing helper instead
of re-implementing one or crawling `dist/`. After `bun install cwip` this file ships in
the package, so an agent can read `node_modules/cwip/AGENTS.md` directly.

`cwip` = "helpful utility functions". Zero required runtime dependencies; a few
subpaths lazy-load an **optional peer** only when you call into them (noted below).

## How to import

ESM only, via **subpath exports** — import the narrowest subpath, not deep `dist/` paths:

```ts
import { pipe, logger, createApiClient, isString } from "cwip";          // core (browser-safe)
import { AppError, registerErrorHook } from "cwip/error";                // also re-exported from cwip
import { loadEnvFile, git, runWithTimeout, extractPdfText } from "cwip/node"; // Node/Bun only
import { runBuildCacheCli, buildInputManifest } from "cwip/build";        // incremental build cache (Node/Bun)
import { buildSelect, assertReadOnlySql } from "cwip/query";             // SQL/Mongo query construction
import { resolveCredentials, runSqlByDialect } from "cwip/dbquery";      // DB execution (lazy drivers)
import { createDbMockRegistry, registerFixtures, recordFixture } from "cwip/db-mock"; // multi-DB mock + fixtures
import { addColumnIfMissing, applyRecommendedPragmas } from "cwip/sqlite"; // bun:sqlite migration + pragma helpers
import { executeServiceNow, resolveSnCredentials } from "cwip/servicenow";
import { readWorkbook, writeWorkbook } from "cwip/excel";                // lazy: xlsx
import { applyStepToWorkbook, buildRevisionView } from "cwip/excel-engine"; // server: peers exceljs, hyperformula
import { STEP_TYPES, type AutomationStep } from "cwip/excel-engine/types";   // browser-safe contract (UI)
import { connectMongo } from "cwip/mongodb";                             // lazy: mongodb
import { parseLoose, formatJson, csvToJson } from "cwip/json";           // tolerant JSON/JS + CSV
import { migrateLayoutConfig, resolveBinding, nodeGridClass } from "cwip/layout"; // layout/widget engine core
import { parseEnvFile, diffEnvSets, upsertEnvVar } from "cwip/env";      // .env parse/edit/compare
import { Toast, ErrorBoundary, EnvEditor, EnvCompare } from "cwip/react"; // React components
import { createAjv, validate } from "cwip/schema";                       // Ajv wrapper
import { inferShape, shapeToInterface } from "cwip/shape";               // data → shape → TS types
import { createRunReport, readReportSummaries } from "cwip/test-report"; // run-report model + dir reader
import type { TestRunReport, TestArtifact } from "cwip/test-report/types"; // browser-safe report types (UI)
import { createE2E, goTo, click, expectText } from "cwip/e2e";           // declarative browser actions (type-only Playwright)
import CwipReporter from "cwip/e2e/reporter";                            // Playwright → test-report reporter
import { jsonValuesMatch, buildSnippet } from "cwip/search";             // universal content-search helpers
import { parseTimingJsonl, aggregateByCategory, CATEGORY_GROUPS } from "cwip/orchestration"; // agent task-timing taxonomy + analytics
import { createApp, securityHeaders } from "cwip/server";                // Express helpers
import { startTestServer, makeHttpTestClient } from "cwip/testing";      // Bun test toolkit
import { midiToFreq, rng } from "cwip/audio";                           // deterministic generative-audio core
import { FakeAudioContext, makeFakeContext } from "cwip/audio/testing";  // Web Audio test doubles (test files only)
```

**Rules of thumb**
- The root (`cwip`) is **browser-safe** — no Node built-ins. Anything touching the
  filesystem, env, git, crypto, workers, or PDFs lives in **`cwip/node`**.
- `cwip/testing` is **Bun-only** (has a no-Bun fallback stub); never import it from
  production code.
- Optional peers are loaded with a dynamic import *only when the function runs*, and
  throw a clear "install X" error if missing: `xlsx` (`cwip/excel`), `mongodb`
  (`cwip/mongodb`), `unpdf` (`extractPdfText`), and the SQL drivers
  `pg`/`mysql2`/`mssql` (`cwip/dbquery`). Importing the subpath never pulls the peer in.

## Subpath map

### `cwip` (core, browser-safe)
- **flow** — function composition + pipelines: `pipe`/`pipeAsync`/`compose`, `curry`,
  `ifIt`/`either`, `createPipeline`/`createRequestPipeline` (+ context), cleanup markers.
- **http** — `createApiClient` (typed fetch client w/ retries/timeouts), `createSessionFetch`
  (cookie jar), `parseSSE`/`parseSSEJson` (+ `parseSSEStream`), JWT (`decodeJwt`,
  `isJwtExpired`, `extractBearerToken`), `buildUrl`/`joinUrl`, `ApiError`,
  `createCachedTokenProvider`, `runCallbackLogin`/`setCallbackInput` (multi-stage callback auth).
- **logging** — `logger`/`createLogger` + config (`updateLoggerLevel`, `loggingSettings`),
  log redaction (`cleanDataForLogging`).
- **error** — `AppError`, error-hook registry (`registerErrorHook`/`runErrorHooks`).
  Also its own subpath `cwip/error` (same exports; import either way).
- **events** — `createEventBus`, `createLifecycle` (typed pre/post hook registry).
- **is** / **validation** — predicates (`isString`, `isEmptyDeep`, `isNullish`, …) and
  key checks (`hasAllKeys`, `getMissingKeys`, `throwIfMissingKeys`, `expectOrThrow`).
  ⚠ arg order differs: `getMissingKeys(obj, keys)` vs `hasAllKeys(keys, obj)`.
- **string** — `interpolate`/`interpolateWith` (`${var}` templating), base64
  (`fromBase64`/`isBase64`), `globToRegExp`, `escapeForRegex`, encoding, ASCII checks.
- **tabular** — `applyTabularOps` (filter/sort/select over rows; the filter ops incl.
  `in`/`notIn`), `parseCsv`/`serializeCsv`, `parseAiTable`, `buildAskPrompt`.
- **format** — `toCsv`, `toTable`/`toTableColumns`. **date** — formatting + relative-date
  helpers. **math** — byte-unit conversions + arithmetic. **array** / **object** /
  **fp** / **functional** — curried collection + object helpers, `deepClone`/`deepFreeze`,
  `assocPath`, `Just`/`Nothing`/`StateMonad`.
- **batch** / **cache** — `createBatcher`, `createTtlCache`. **capture** — record/replay
  fetch+calls for tests (`captureFetch`, `createMemoryCaptureSink`). **bookmarks** —
  `parseBookmarksHtml` (DOM-free NETSCAPE parser).

### `cwip/node` (Node/Bun only)
- **git** — a big porcelain-free git toolkit: `git` runner, `currentBranch`/`defaultBranch`,
  `localBranches`/`remoteRefs`/`goneBranches`, `aheadBehind`/`aheadBehindRefs`,
  `branchCreatedAt`, `listTags`/`tagCommit`, `cloneRepo`, `remoteUrl`, `checkout`,
  `commitAll`, `ffPull`/`fetchRemote`, status + diff (`statusEntries`, `diffNameStatus`,
  `fileDiff`), `stashPush`/`discardPaths`/`discardAll`, `hasUncommittedChanges`.
- **env/config** — `loadEnvFile`/`parseEnvText`, `requireEnv`/`optionalEnv`/`boolEnv`,
  `loadJsonConfig`/`saveJsonConfig`.
- **file/path/directory** — `readFile`/`writeFile`, `walkDir`, `isDir`/`fileExists`,
  `createSymlink(Safe)`, `joinPath`, `expandHome`, `makePathStringFromAppRoot`.
- **crypto** — `deriveKey`, `encryptSecret`/`decryptSecret` (AES-GCM secret box),
  `obfuscate`/`deobfuscate`, `safeEqual`.
- **pdf** — `extractPdfText` (text layer; lazy `unpdf`, injectable backend).
- **worker** — `runWorkerPool`. **shutdown** — `createShutdownManager`. **shell** —
  `execAsync`. **dns** — `checkConnection`.
- **process** — `runWithTimeout` (spawn an argv command, no shell, SIGTERM→SIGKILL
  on timeout; returns `{timedOut,code,signal,error}`) + `runWithTimeoutCli` (the
  `[ms] cmd…` CLI behind a `withTimeout` wrapper); `installUncaughtErrorHandlers`
  (structured `uncaughtException`/`unhandledRejection` logging via cwip's logger +
  the `AppError` summary; idempotent, returns an uninstaller, optional fail-fast).

### `cwip/build` (Node/Bun only — incremental build cache)
Fingerprint a build target's INPUT files into a saved manifest, then skip the build
when nothing changed (and force it when the output dir is missing). `buildInputManifest`
(reuses `walkDir`/`git`; hashes the target tree + `extraDirs` like a symlinked `shared/`
+ root `rootInputs`/`.env*`; never follows symlinks; keys are repo-root-relative POSIX
paths), `diffManifests`, `loadManifest`/`saveManifest`, `checkBuildCache` →
`{fresh,reason,diff}`. `runBuildCacheCli(config)` is the engine behind a thin app wrapper:
`check|save|clean [dir]`, returns an exit code (never calls `process.exit`). Defaults
(`DEFAULT_IGNORE_DIRS` etc.) are exported so apps extend rather than restate. Manifests
default to `<root>/node_modules/.cache/cwip-build`. **Build outputs/deps are excluded**
so the build's own product can't pollute the signal.

### `cwip/query` (browser+server safe — query *construction*)
`buildSelect`/`toInlineSql`, `buildMongoFind`/`toMongoShell`, `conditionsToMongoFilter`,
`assertReadOnlySql`/`isReadOnlySql` (+ `WriteQueryBlockedError`), `COMPARISON_OPS`,
`SQL_DIALECTS`/`QUERY_ENGINES`, types `Condition`/`OrderBy`/`SqlSelectSpec`.

### `cwip/dbquery` (server — query *execution* + credentials)
`resolveCredentials` (env-keyed, NO password in app DB; `<PREFIX>_<KEY>_URL/PASSWORD/USERNAME`),
`credentialEnvPrefix`, `writesAllowed`, `runSqlByDialect`/`runMongo` (lazy `pg`/`mysql2`/`mssql`/`mongodb`),
`clampCap`, row-cap/timeout constants, `ConnectionRecord`/`ResolvedCredentials` types.

### `cwip/sqlite` (framework-free SQLite schema helpers)
For the `CREATE TABLE IF NOT EXISTS` + idempotent `ALTER` DB-init both apps drive by hand. Takes a
structural `SqliteDatabaseLike` (bun:sqlite's `db.query(sql).all()` / `db.run(sql)`) so cwip never
imports a driver. `addColumnIfMissing(db, table, column, definition)` (idempotent additive migration,
returns whether it added; no-ops when the table doesn't exist yet — the guarded form), plus
`columnExists`/`tableExists`/`getColumnNames` (identifier-validated against SQL smuggling).
`applyRecommendedPragmas(db, opts?)` applies a configurable WAL/`synchronous`/`busy_timeout`/
`wal_autocheckpoint`/`foreign_keys` baseline (defaults to the recommended app-server suite, `null`
skips a pragma, `foreignKeys: true` enforces FKs).

### `cwip/taskq` (SQLite task-queue engine — atomic claim/lease)
The driver-agnostic engine behind the SQLite orchestrator (replaces the markdown `TASKS.md` + bash
drainer; see `src/services/taskq/DESIGN.md`). Takes a structural `TaskqDb` handle (bun:sqlite-shaped,
no driver import) so it's unit-testable in-memory. `migrate(db)` (idempotent forward-only
migrations, `SCHEMA_VERSION`); task CRUD + fractional-`ord` positioning (`addTask`/`updateTask`/
`getTask`/`listTasks`/`setStatus`/`moveTask`/`deleteTask`, `Position` = top/bottom/before/after);
atomic claim/lease (`nextEligibleId`/`claim`/`claimNext` — `UPDATE … WHERE status='ready'` CAS inside
`withTx` IMMEDIATE; one-shots before off-cooldown recurring; deps/group/tier gating), lifecycle
(`completeTask`/`failTask`/`releaseLease`, `heartbeat`, `reapExpired` reclaims stranded leases =
resume); pure helpers `depsSatisfied`, `isRecurDue`, `validateNewTask`; path resolver
`taskqHome`/`taskqDbPath` (`~/.taskq/`, `TASKQ_HOME`/`TASKQ_DB` overrides). `TASK_STATUSES`:
pending_triage/ready/claimed/blocked/on_hold/needs_input/not_ready/failed/done.

### `cwip/servicenow` (ServiceNow REST — pure, injectable fetch)
`executeServiceNow` (table read/write + passthrough), `resolveSnCall`/`buildAuthHeader`/
`normalizeSnResponse`, `clampSnLimit`/`normalizeBaseUrl`, and creds:
`resolveSnCredentials` (`SN_<KEY>_TOKEN`→Bearer / `SN_<KEY>_PASSWORD`(+`_USERNAME`)→Basic /
`SN_<KEY>_URL` override) + `snWritesAllowed`.

### `cwip/excel` · `cwip/mongodb` (lazy peers)
`readWorkbook`/`readSheet`/`writeWorkbook` (lazy `xlsx`); `connectMongo` (lazy `mongodb`).

### `cwip/excel-engine` (pure step engine — peers: exceljs, hyperformula)
The server-side engine behind "excel automations" (upload a workbook → apply an ordered list
of declarative steps → render). `applyStepToWorkbook(wb, mask, step)` mutates an exceljs
workbook for one `AutomationStep` (the discriminated union: keepSheet/filterRows/sortRows/
filterColumns/addColumn/fillColumn/manualEdit) and returns an `ExecOutcome`; `buildRevisionView`
renders one sheet (capped) for a data grid; `evalGroup`/`evalCondition`/`compareValues` are the
condition system; `evalFormulaColumn` evaluates an Excel formula down a column via HyperFormula
(GPLv3, `licenseKey: "gpl-v3"`); `loadWorkbook`/`workbookToXlsxBytes` are the bytes⇄workbook IO.
**No persistence/HTTP/UI** — each app owns its revision store, routes, and grid and drives the
engine. The `AutomationStep`/`RevisionView`/`StepResult`/`ExcelAutomation` types are the shared
contract between the builder UI and the executors.

A **browser-safe** subpath `cwip/excel-engine/types` re-exports just that type contract plus the
const arrays/labels a builder UI uses (`STEP_TYPES`/`STEP_TYPE_LABEL`, `COMPARISON_OPS`/
`COMPARISON_OP_LABEL`, `UNARY_OPS`, `DATE_OPS`) — no exceljs/hyperformula, so a React app imports
types from here while only the server imports the full engine.

### `cwip/health` (pluggable health-check registry)
Framework-agnostic. `createHealthRegistry`/`runHealthChecks`/`summarizeHealth` run a set of
app-registered checks (each yielding a rich `{ status, detail, remediation }` `HealthResult`)
into an aggregated report — drive an admin console, alerting, or readiness from one source.
`probeCheck`/`httpProbe` turn a throwing probe (DB ping, HTTP call) into a check. No
Express/DB/logger coupling — the opposite of a hardcoded health route.

### `cwip/log-review` (incremental request/server-log analyzer)
Framework-agnostic, INCREMENTAL log review. The app persists a watermark and fetches only
rows newer than it (never a full-table scan), then hands that window to `reviewLogs`, which
returns structured bottleneck / error-spike / host-anomaly findings with stable dedupe keys.
`findingToTaskDraft` turns a finding into an idempotent follow-up task draft (feeds
`cwip/taskq`); `thresholds`/`types` are the tunable knobs + contract. No DB/clock/framework/
logger coupling — the app owns those; this is the one shared source of "what counts, and how
we phrase it".

### `cwip/layout` (framework-agnostic layout/widget engine core)
The pure core of the designed-layout engine (list cards/detail/dashboards + custom pages):
the v2 `LayoutNode` tree model (`LayoutBinding`/`NodeStyle`/`LayoutView`/`ListLayoutConfig`)
+ idempotent `migrateLayoutView`/`migrateLayoutConfig` (run on every server read AND write —
upgrades legacy v1, clamps/normalizes v2, depth-limits nesting); pure `treeOps`
(`addInTree`/`removeInTree`/`updateInTree`/`reorderInContainer`/`moveInTree`) for an editor;
`computeAggregate`/`computeDistribution` (KPIs/breakdowns over a row set); the responsive
12-col grid + style-token class maps (`nodeGridClass`/`nodeBoxClass`/`nodeTextClass` — written
out in full so a Tailwind scanner emits them; a v4 consumer MUST `@import "cwip/styles.css";`
or `@source` the **whole** `cwip/dist` — see `cwip/react`'s note below — so these `col-span-*`/
tone/border classes generate, else every layout node collapses to a 1/12-width track); and the generic
`LayoutField`/`LayoutRow` + `resolveBinding`/`ResolveEnv`/`ResolvedBinding` contract (generic
over the field type `F extends LayoutField`). **No React/persistence** — the renderer + drag
editor live in `cwip/react`, and each app supplies its own widget registry + binding resolver +
field type.

### `cwip/react` (UI components)
`Toast`/`ToastList`, `ErrorBoundary`/`useErrorBoundary`/`withErrorBoundary`, `Spinner`, `Tooltip`, `InfoHint`,
plus `./styling` (`StyleableProps`, `resolveClass`, `resolveStyle`, `cx`). The styled components (InfoHint —
hover/click-pin field help; Tooltip; Toast/ToastList) are **Tailwind-first**, and so is the layout
engine (`cwip/layout`). A v4 app generates cwip's classes by registering cwip's dist as a Tailwind
source — the un-trip-able way is one import: `@import "cwip/styles.css";` (after `@import "tailwindcss";`),
which `@source`s the **whole** dist for you. The hand-rolled equivalent is `@source "../node_modules/cwip/dist";`
— the **WHOLE** dist, **not** `dist/react`/`dist/web/react`: the narrower paths omit the layout grid
classes in `dist/core/layout`, silently collapsing every layout node to a 1/12-width track. (Optionally
also `@import "cwip/react/theme.css";` for the emerald accent default.) Each exposes a uniform override API:
per-slot `classNames`/`styles` (string/object MERGES, function `(default)=>next` REPLACES) + `unstyled: boolean |
'all'` (`true` drops the visual classes but KEEPS positioning; `'all'` drops positioning too); top-level
`className`/`style` = the `root` slot. `Spinner` is SVG-prop styled; `ErrorBoundary` is logic-only.
**Theming:** the whole brand surface (Button `accent` variant, Switch, SegmentedControl, Pagination,
Checkbox, the field focus ring, DropIndicator, InfoHint icon) fills/rings off ONE token, `accent`
(`--color-accent`/`--color-accent-hover`). Import `cwip/react/theme.css` for the emerald default, or define
those vars (via `@theme inline` over a CSS var for a light/dark swap) to rebrand. **Hover/click help:**
`Button`/`ButtonLink`/`IconButton` take a `tooltip` (multiline `Tooltip`); `FieldLabel` takes a `hint` (`InfoHint`).
**Charts (peer: `recharts`):** the theme-aware dashboard chart kit — `TimeSeriesChart`/`LabeledSeriesChart`
(line/area `ComposedChart`), `CategoryBars`/`MiniBarChart`/`StackedBars`, `DonutChart`/`CategoryDonut`/`StatusDonut`,
`Sparkline`, `StatTile`, the themed `ChartTooltip`, dependency-free `format*` helpers, and a self-contained
read-only `DataTable` (inline pager, no extra deps). Theming is **injected**, not Redux-bound: wrap the
dashboard once in `<ChartThemeProvider theme={chartThemeFor(isDark)}>` (or pass `LIGHT_THEME`/`DARK_THEME`/a
custom `ChartTheme`); with no provider, `useChartTheme()` falls back to `DARK_THEME` (charts render standalone,
never throw). All chart types are exported (`Series`, `BarDatum`, `StackSeries`, `LabeledSeries`, `DonutSlice`,
`ChartTheme`). `recharts` is an optional peer — only the chart subtree imports it.

### `cwip/orchestration` (agent task-timing taxonomy + analytics)
Pure (browser+node, no React). The **source of truth** for the `orchlog` recorder's category/group
vocabulary (`CATEGORY_GROUPS`/`CATEGORY_KEYS`/`CATEGORY_LABELS`/`CATEGORY_GROUP_LABELS`/`groupOf` +
stable per-category chart hues `CATEGORY_COLORS`). `parseTimingJsonl(text)` turns the recorder's JSONL into
typed `TimingEvent`s — TOLERANT (skips blank/comment/malformed lines, coerces an unknown category to `'other'`,
never throws). Rollups: `aggregateByCategory(events, { excludeTaskRows? })` → one `CategoryStat`
(count/total/min/max/mean/median/p95) per category (excludes the `kind:'task'` summary rows by default),
sorted by total desc; `summarize(events)` → task/event counts, total, per-group totals, and the time span.
`quantile`/`median` are the math helpers behind p95/median. Consumed by the external app "Orchestration Processing"
analytics + any timing dashboard (with `cwip/react`'s charts).

### `cwip/schema` (Ajv wrapper)
`createAjv`/`getAjv`, `compileSchema`, `validate`, `normalizeSchemaErrors`.

### `cwip/server` (Express helpers)
`serveApp` (the whole-server convenience: createApp + http server + graceful-shutdown
manager + listen) and the `createApp` factory it builds on (correlation id → security
headers → CORS → compression → JSON → request logging → routes → health → static/SPA →
404 → error). Plus the pieces: `securityHeaders`, `corsWhitelist`, `requestLogger`,
`addStaticSpa` (static dir + SPA index fallback), `addHealthRoutes`,
`errorHandler`/`notFoundHandler`. `compression` is an optional lazy peer.

### `cwip/site-smoke` (headless site LOAD+NAVIGATE smoke)
The anti-"site will not load" engine for the promotion gate + main-health watchdog. Unlike a
single-page render smoke, it boots the app the way the OWNER runs it (a real server — typically
the vite DEV server, where import-analysis is lazy/on-demand), drives a HEADLESS browser,
NAVIGATES every key route, and on EACH page asserts: the React root mounted, no uncaught
console/page errors, no vite import-analysis / failed-to-resolve / missing-module errors, and
(optionally) a landmark is present. Pure core — `planSiteSmoke`/`decideSiteSmoke`/`decideRoute`,
`classify` (`isViteImportError`/`firstImportError`/`DEFAULT_IGNORE_CONSOLE`), `siteSmokeHealSlug`/
`siteSmokeHealBody`/`siteSmokeHealReason` (the deduped, crash-loop-safe heal-task body naming the
exact failing route + verbatim import/console error) — plus an impure `runSiteSmoke` with every
seam injected (`startService`/`runProbe`/`runBuild`/`resolvePlaywright`), `pickFreePort`,
`siteSmokeHomeDir`. Playwright is an OPTIONAL peer driven in a `node` subprocess; absence is
INCONCLUSIVE (`ran:false` — never blocks promotion), not a failure. Catches the dev-only class a
cached/eager build + single-page render smoke miss (e.g. an app missing `ChartThemeProvider`).

### `cwip/testing` (Bun-only test toolkit)
`startTestServer` (spawn a real server, poll health, capture logs), `makeHttpTestClient`,
`isolateEnvDir`/`makeTempDir`, `defineFixture`/`seqId`, run-report builders
(`createRunReport`/`writeReportFiles`/`renderReport*`), `parseJUnitXml`, `fake`, system-mock toggles.

### `cwip/audio` (browser — deterministic generative-audio core)
Seeded RNG primitives (`hash32`/`splitmix32`/`mulberry32`/`hashString`/`rng`) + music-theory
pitch math (`midiToFreq`/`freqToMidi`/`midiToNote`/`noteToMidi`, scale/chord helpers).
Intentionally narrow — DSP (voices, reverb, scheduler, master bus) stays per-game by design
so each game's sonic character can diverge. See `src/web/audio/core/` for the implementation.

### `cwip/noise` (browser — seeded deterministic spatial noise)
Pure integer-hash spine + smooth value noise / fBm / ridge / Worley / curl for procedural terrain,
atmosphere, material textures, and particle drift. All functions take a `seed` integer; no
Math.random, no clock — byte-identical on every machine. Uses the MurmurHash3-style `hash32` from
`cwip/audio/core` (re-exported as `cwip/noise`'s `hash32`). Exports: `hash32`, `value2D`,
`value3D`, `fbm2D`, `ridge2D`, `ridged`, `worley2D`, `curl2D`.

### `cwip/audio/testing` (test doubles — no runtime dep)
Recording Web Audio fakes for specs that inject a browser `AudioContext` without happy-dom.
- `FakeParam` — records every AudioParam op (`setValueAtTime`/`linearRamp`/…).
- `FakeNode` — records `connect`/`disconnect` (tracks `disconnectCount`), `start`/`stop`,
  FM modulation targets (`modTargets`), WaveShaper `curve`, `periodicWave`. Provides all
  common AudioNode param getters (`gain`, `frequency`, `detune`, `Q`, `pan`, `playbackRate`, …).
- `FakeContextOpts` — `{ failWorklet?, noWorklet? }` for AudioWorklet fallback testing.
- `FakeAudioContext` — full `createXxx` factory superset (`createGain`/`createOscillator`/
  `createBiquadFilter`/`createDelay`/`createStereoPanner`/`createDynamicsCompressor`/
  `createBufferSource`/`createWaveShaper`/`createPeriodicWave`/`createAnalyser`/`createBuffer`),
  AudioWorklet simulation (`addedModules`, `workletNodes`, `makeWorkletNode`), and test helpers:
  `byKind(kind)`, `reaches(from, to)`, `activeOscillators(t)`.
- `makeFakeContext(opts?)` — factory alias for `new FakeAudioContext(opts)`.
Game-specific helpers (transport stubs, storage stubs) belong in the game's own spec helpers.

## Conventions
- Source is in `src/<area>/`; the root barrel re-exports the browser-safe areas, and each
  subpath has its own `src/<name>/index.ts`. Tests are `*.test.ts` (Bun), preloaded.
- Build: `bun run build` (tsc → `dist/`, then ESM-extension fixup). Gate: `bun run done`
  (`check` = biome + typecheck, then `test`, then `build`). Only `dist/` (+ this file) ships.
- Adding a subpath = new `src/<name>/` + `index.ts` + a `./<name>` entry in `package.json`
  `exports`; keep Node-only code out of the root barrel.
