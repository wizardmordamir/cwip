# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Shorthand the user types:** **ca** = cursedalchemy (the sole active app), **ru** = rubato (sunsetting — maintenance-only). The user uses these abbreviations in prompts and tasks. (This note is repo-local guidance only — keep it out of the published `AGENTS.md`.)

> ⚠️ **Active scope: `ca` is the primary consumer.** `rubato` is sunsetting; its cwip dependency is locked and not being updated for ru-specific features. New cwip utilities should be driven by ca's needs or be genuinely app-agnostic.

> 📐 **Engineering standards: `cursedbelt/STANDARDS.md`** is the ONE canonical source of truth for the whole refactor (placement: `cwip` vs `cursedbelt` vs the app; reuse-not-duplicate; layering + Biome rules; the ctgr/getOnly server invariants; the integration-flow worktree workflow; optimize-don't-accumulate-tech-debt). **Read it before adding code — a generic helper probably already exists in `cwip`; extend it instead of writing a second copy.** (Repo-local guidance — keep it out of the published `AGENTS.md`.)

## What this is

`cwip` is a zero-runtime-dependency TypeScript utility library, published to npm as an
ESM-only, tree-shakeable package (`"sideEffects": false`). The toolchain is **Bun** (test
runner + package manager), **tsc** (build/emit), and **Biome** (lint/format). There is no
bundler — tsc emits the published `dist/`.

## Commands

```sh
bun test                         # run all tests (Bun runner; preloads ./src + scripts/testSetup)
bun test src/array/chunk.test.ts # run a single test file
bun test -t "some test name"     # run tests matching a name pattern
bun run check                    # biome check ./src  +  typecheck (run before committing)
bun run fix                      # biome autofix (--write --unsafe) — formats & organizes imports
bun run typecheck                # tsc --noEmit for both src (tsconfig.json) and tests (tsconfig.spec.json)
bun run build                    # clean → tsc -p tsconfig.build.json → fixEsmExtensions
bun run done                     # check + test + build — the full gate before publish
```

`bun run done` is the definition of "verified" here — it must pass before anything lands.

- **Verify gate tiering:** cwip's `done` is light (check + test + build, no e2e), so running the
  full `done` per task is fine here. The general principle still holds — scope the gate to what
  you changed; reserve any heavy/integration suite for a batch-finalize sweep, not every micro-task.
  See "Verify gate tiering" in `~/.claude/CLAUDE.md`.

## Git workflow — worktrees + the integration flow (always-green main)

**cwip is a provider in a multi-app refactor that keeps an ALWAYS-GREEN `master`.**
Task work churns on a parallel `refactor/integration` branch (in the
`cwip-integration` worktree) where intermediate-broken, cross-repo states are
tolerated; `master` is **promotion-only** and only ever fast-forwards to a
*verified-green* integration via the cross-repo promotion gate (the evolved
`main-health-watchdog`). The worktree workflow in `~/.claude/CLAUDE.md` is the
source of truth for everything else (clear the primary, commit when verified,
resolve conflicts yourself, local-only, never edit the primary). The
integration-flow specifics that OVERRIDE its "merge to the default branch" default:

| Placeholder | cwip value |
| --- | --- |
| default branch | `master` (promotion-only) |
| integration branch | `refactor/integration` (worktree: `$ROOT/../cwip-integration`) |
| worktrees-dir | `cwip-worktrees` — name a task worktree `<slug>-integration` |
| setup | `bun i` (cwip has no `bun run setup`; a fresh worktree just needs its own deps) |
| verify | `bun run done` (check + test + build) — for THIS repo's scope |

- **Branch FROM `refactor/integration`, merge BACK to it — never to `master`.** Name
  the worktree `<slug>-integration` so first-party consumers resolve the right variant.
- **Verify THIS repo** (`bun run done`); cross-repo/whole-system breakage on
  integration is tolerated (a heal task fixes it). Always confirm cwip builds first.

```bash
# Start a feature (on the integration flow)
ROOT=$(git worktree list | head -1 | awk '{print $1}')   # primary (stays on master, promotion-only)
INT="$ROOT/../cwip-integration"                           # the permanent integration worktree
git -C "$ROOT" status --short                            # nothing stranded? commit it first if so
SLUG=feat/<short-kebab-slug>                              # feat | fix | chore | refactor
WT="$ROOT/../cwip-worktrees/<short-kebab-slug>-integration"
git -C "$ROOT" worktree add -b "$SLUG" "$WT" refactor/integration
cd "$WT" && bun i                                         # fresh checkout needs its own deps

# Land it (only when done AND this repo's verify gate is green)
git merge refactor/integration                           # from $WT: fold integration in, resolve here
git -C "$INT" merge --ff-only "$SLUG"                    # advance refactor/integration in its worktree
cd "$ROOT" && git worktree remove "$WT" && git branch -d "$SLUG"
# master is NOT touched — the promotion gate fast-forwards it once the whole system is green.
```

**cwip is consumed via its built `dist/` — keep the integration build fresh.**
Consumers (ca, ru) symlink-resolve `cwip` per variant: an `-integration` checkout
points at `cwip-integration/dist`, a main checkout at `cwip/dist` (see each
consumer's `relinkFirstParty.ts`). So after landing on `refactor/integration`, run
`bun run build` in **`$INT`** (`cwip-integration`) so integration consumers see the
new build. The promotion gate rebuilds the primary's `dist/` when it promotes
`master`. The old global `bun link` is no longer the wiring — the consumers' symlink
guards are.

## Three entry points (the central architectural rule)

The package exports three subpaths, split by **runtime capability** so a browser consumer
never resolves Node- or Bun-only code. This split is load-bearing — respect it when adding code:

| Subpath | Runtime | Source | May import |
| --- | --- | --- | --- |
| `cwip` | browser · Node · Bun | `src/index.ts` | pure JS only — **no `node:*`, no `bun:*`** |
| `cwip/node` | Node · Bun | `src/node/index.ts` | `node:*` built-ins OK; no `bun:*` |
| `cwip/testing` | **Bun test only** | `src/testing/index.ts` | `bun:test` OK |

Placement rules when adding a utility:
- Needs a `node:*` built-in (crypto, fs, path, dns, child_process)? → put it under `src/node/`
  (or re-export from `src/node/index.ts`), **not** in the root tree. Keeping the root browser-safe
  is the whole point.
- Imports `bun:test`? → it belongs only under `src/testing/`.
- `cwip/node` deliberately does **not** re-export `src/testing` (that would drag `bun:test`
  into plain Node and throw). See the comment block in `src/node/index.ts`.

The `cwip/testing` subpath uses the package.json `"bun"` export condition: Bun loads the real
`testing/index.js`; every other runtime loads `testing/_noBun.js`, which throws a clear
"requires the Bun runtime" error at import time. The `types` condition still points at the real
`.d.ts` so editor types are correct everywhere.

## Module convention (one function per file)

Every utility follows the same shape, recursively:
- `src/<category>/<fnName>.ts` — a single exported function.
- `src/<category>/<fnName>.test.ts` — co-located Bun test (`import { ... } from 'bun:test'`).
- `src/<category>/index.ts` — barrel that re-exports every sibling (`export * from './chunk';`).
- `src/index.ts` — barrel of barrels (re-exports each category's index).

To add a utility: create `fn.ts` + `fn.test.ts`, then add one `export * from './fn';` line to the
category `index.ts`. New categories also need a line in the appropriate top-level index
(`src/index.ts`, `src/node/index.ts`, or `src/testing/index.ts`).

## Imports stay extensionless; the build adds them

Source uses extensionless relative specifiers (`export * from './array'`) because tsc runs with
`moduleResolution: "bundler"` for nicer DX. Native Node ESM rejects that, so the post-build script
`scripts/fixEsmExtensions.ts` rewrites every emitted relative specifier in `dist/` to an explicit
`./array/index.js` / `./foo.js`. **Don't hand-write `.js` extensions in source** — the build owns that.

## Testing utilities & the mock registry

`src/testing/` provides reusable mocks so consumers don't re-implement `fs`/`console` mocking.
The core is a singleton `MockRegistry` (`src/testing/registry.ts`) that swaps `node:fs` and
`node:console` globals for Bun mocks:
- `scripts/testSetup/index.ts` (preloaded via `bunfig.toml`) calls `enableSystemMocks()` before any
  test runs — so system mocks are ON by default during the suite.
- In tests: `fake('fs.promises.readFile', value)` overrides a resolved value by dotted path;
  `fakeReject('fs.promises.writeFile', err)` forces a rejection; `resetAllMocks()` (typically in
  `beforeEach`) restores defaults. Also exported: `makeMockApp/Logger/Req/Res`, `mockMongoDB`,
  HTTP/server/fixture/JUnit-report helpers.

## Conventions

- Biome enforces: single quotes, semicolons, trailing commas (all), 2-space indent, 120 col,
  organize-imports on. `noExplicitAny` and `noNonNullAssertion` are **off** — `any` and `!` are allowed.
- Strict TypeScript, but `noImplicitAny: false`.
- `*.ignore.*` files and `___*` dirs are throwaway/gitignored scratch — ignore them; tests and
  coverage already exclude `**/*.ignore*`.
