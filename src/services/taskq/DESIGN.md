# taskq — Intelligent Orchestrator · DESIGN

Source-of-truth design for replacing the markdown `TASKS.md` + bash drainer with a
SQLite-backed, token-aware orchestrator. Companion to
[`Usage_Limit_Orchestrator_Plan.md`](./Usage_Limit_Orchestrator_Plan.md) (the
token-optimization side plan, folded in below).

> Status: **PLANNING — no implementation until explicit "go".**
> Last updated: 2026-06-17.

---

## 0. Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | Placement | **engine + CLI in `cwip`** (`cwip/taskq`); **orchestrator + UI in `rubato`**; **DB in a home-dir dir** |
| 2 | Orchestrator language | **TS / Bun** |
| 3 | Storage dir | **`~/.taskq/`** — portable, machine-independent, re-creates on a fresh box |
| 4 | Markdown view | **Optional, off by default**, generated deterministically by the CLI (zero tokens). rubato reads the DB directly via a **connection string** (`TASKQ_DB` / `TASKQ_HOME`) |
| 5 | Repo scope | **Cross-repo from day one** (ca / ru / cwip) |
| 6 | Telemetry | **Self-accounting ledger + manual baseline**; programmatic `/usage` scrape is a **non-blocking spike** |
| 7 | Autonomy default | **Conservative**: deterministic scheduling + manual override first; auto-triage is **opt-in (blank model/think) + globally toggleable + budget-capped** |
| 8 | Build scope | **Layered**: deterministic core first, then intelligence in later phases |
| 9 | Migration | **Strangler (Option 2)**: old system runs to depletion; never two orchestrators at once; one-time importer for the standing-task residue |

---

## 1. Goals / non-goals

**Goals**
- One **atomic concurrency authority** (SQLite, WAL) for every writer — orchestrator, workers, CLI, UI, human. No more mkdir mutexes or markdown-edit races.
- **Structured queue**: eligibility as SQL, edits by stable id, priority as a column, dependencies/groups/recurrence as relations, history/runs/timings joinable.
- **Token-aware scheduling**: respect rolling Max-plan limits; burn expiring capacity, throttle when scarce.
- **Reduce human input toward "just write the task"** — but conservatively, with manual override always available.
- **Keep human inspectability** (optional generated markdown view; rich UI).

**Non-goals (v1)**
- Multi-machine / networked queue (single local machine; SQLite is perfect for that).
- Replacing interactive Claude Code usage accounting (we can only fully see *our own* orchestrated burn; the rest is closed by manual recalibration).
- Keeping idle Claude instances "sleeping" — we launch per task (triage-before-launch instead).

---

## 2. Migration strategy (strangler / Option 2)

1. Old system keeps draining its queue while the new one is built + validated.
2. **Never two orchestrators running at once** → zero cross-system claim races.
3. New UI pages let you queue tasks into the new DB *before* the new orchestrator is switched on.
4. The old queue won't hit zero on its own (recurring + `[b]` holds are standing) → a **one-time importer** (`TASKS.md` → DB) handles the residue at cutover. The importer also makes "deplete-then-switch" optional: you can import remaining one-shots and cut over early if the new system proves solid.
5. Cutover: stop old → reaper/resume sanity check → start new. Delete old after a clean burn-in.

---

## 3. Architecture

```
~/.taskq/                         ← portable, machine-independent
  taskq.sqlite (+ -wal/-shm)      ← single source of truth (WAL)
  config.json                     ← orchestrator config (jobs, fleet, autonomy toggles)
  runs/                           ← per-run jsonl (kept; now also ingested to DB)
  TASKS.view.md                   ← OPTIONAL generated mirror (zero-token)

cwip/taskq  (shared library + bin)
  engine/   pure TS: eligibility (SQL), atomic claim, lease, recurrence, scheduling
  cli/      `taskq` bin: next/claim/complete/block/hold/add/spinoff/usage/view
  schema/   migrations

rubato  (dashboard consumer + process owner)
  server/   imports cwip/taskq engine; reads DB via TASKQ_DB connection string
  orchestrator (TS): JOBS workers, worktrees, fleet tiers, graceful-stop, reaper
  ui/       Orchestrator v2 pages: board, builder, usage, input-queue, override panel

launchd watchdog (kept, thin): ticks the orchestrator + runs the lease reaper
```

**Connection string:** `TASKQ_DB=file:$HOME/.taskq/taskq.sqlite?mode=rwc` (+ `TASKQ_HOME=$HOME/.taskq`). All consumers open the same file; WAL + `busy_timeout` make concurrent access safe.

---

## 4. Data model (SQLite)

```sql
-- Core queue
tasks(
  id            INTEGER PRIMARY KEY,
  ord           REAL,                 -- priority within status (sparse, easy reorder)
  status        TEXT,                 -- see §5
  title         TEXT NOT NULL,
  body          TEXT,
  repo          TEXT,                 -- ca | ru | cwip | NULL
  model         TEXT,                 -- alias or NULL (NULL = triage may fill)
  think         TEXT,                 -- off|low|medium|high|max or NULL
  fast          INTEGER DEFAULT 0,
  group_key     TEXT,                 -- (group:G)
  recur_n       INTEGER,              -- (recur:N) cadence; NULL = one-shot
  recur_last    INTEGER,              -- completions-count stamp
  parent_id     INTEGER,              -- epic → child hierarchy
  note          TEXT,                 -- why blocked/on-hold/needs-input (§6 of side plan + your item 6)
  triage_state  TEXT,                 -- ungraded | graded | n/a
  complexity    TEXT,                 -- triage grade: single | epic | NULL
  created_at, updated_at
)

task_deps(task_id, needs_id)          -- (needs:X); blocked while needs_id incomplete

leases(                               -- a claim = a lease, not a flag
  task_id PRIMARY KEY, worker_id, worktree,
  claimed_at, heartbeat_at, expires_at
)

completions(                          -- history (was Tasks_Completed.md)
  task_id, title, repo, commit, started_at, ended_at, duration_s, summary
)

runs(                                 -- per claude -p result (was runs/*.jsonl)
  id, task_id, session_id, model, input_tok, output_tok, cache_tok, cost_usd, duration_ms, at, is_error
)

-- Token accounting (§ telemetry)
usage_ledger(                         -- timestamped, model-weighted consumption events
  id, at, model, weight_units, source   -- source: run | manual | calibration
)
limit_buckets(                        -- the rolling windows
  key,                                -- session_5h | weekly_total | weekly_sonnet
  limit_units, window_seconds, reset_at, last_calibrated_at, weights_json
)

clarifications(                       -- the no-stall user-input queue (§ triage)
  task_id, question, asked_at, answered_at, answer
)
```

---

## 5. Lifecycle states (unifies your item 6 + the side plan)

| State | Meaning | Dispatchable? | Replaces |
|---|---|---|---|
| `pending_triage` | blank model/think, awaiting grading | no (until graded) | — |
| `ready` | configured, eligible | **yes** | `[ ]` |
| `claimed` | lease held, executing | no | `[~]` |
| `blocked` | dependency unmet (auto) | no (auto-clears) | `(needs:)` / `[-]`-ish |
| `on_hold` | **your manual hold + optional `note`** | no (manual flip) | `[b]` |
| `needs_input` | gateway/clarification pending | no (skipped; tree paused) | new (`Paused_For_User`) |
| `not_ready` | external dep | no | `[-]` |
| `failed` | AI-blocked mid-run + `note`/reason | no | `[!]` |
| `done` | complete → `completions` | n/a | `[x]` |

**Your item 6** = `on_hold` + `blocked` + a free-text `note` column, surfaced in the builder/board with a "why" field. `needs_input` is the side plan's gateway, with the question stored in `clarifications` and shown in the UI **Input Queue**; the scheduler **ignores that task tree and keeps working independent tasks** (your existing "skip blocked, take the next" rule, formalized).

---

## 6. Concurrency model

- **WAL + `busy_timeout`** (already rubato's baseline) → many readers + serialized writers, no `SQLITE_BUSY` failures.
- **Atomic claim:** `UPDATE tasks SET status='claimed' WHERE id=? AND status='ready'` inside a txn that also inserts a `leases` row. The `WHERE status='ready'` is the compare-and-swap — two contenders can't both win.
- **Leases, not flags:** `(worker_id, claimed_at, heartbeat_at, expires_at)`. Workers heartbeat; the **reaper** (watchdog tick) reclaims expired leases → `ready` (or `resume`). This *is* the "stranded `[~]` → resume" behavior, made principled.
- Group claims happen in one txn (claim all `group_key` members together).

---

## 7. Agent interface (`taskq` CLI)

The agents no longer "edit a line." Narrow verb surface = the protocol lives in one tested place:

```
taskq next   [--repo --model --think --tier ...]   → pick next eligible task (JSON)
taskq claim  <id> --worker <w> --worktree <slug>    → atomic claim (+ group)
taskq complete <id> --commit <sha> --summary ...    → done → completions
taskq fail   <id> --reason ...                      → failed + note
taskq hold   <id> --note ...   |   taskq unhold <id>
taskq block  <id> --needs <ids>  (usually implicit via deps)
taskq add    "<title>" [--body --model --think --needs --group --recur --repo --note --pos]
taskq spinoff "<title>" --parent <id> ...           → follow-up child task
taskq usage  calibrate --bucket session_5h --consumed 100 --reset-in 1h
taskq view   [--write ~/.taskq/TASKS.view.md]       → deterministic markdown mirror (0 tokens)
```

CLAUDE.md / the next-task skill get a short rewrite: "call `taskq claim`/`taskq complete`" instead of "edit the heading."

---

## 8. Orchestrator (TS, ports drain-queue.sh)

Responsibilities carried over, reimplemented against the engine (no shelling to a bash brain):
- single-instance lock; JOBS concurrent workers; persistent reuse worktrees `<repo>-worktrees/_drain-w<n>`.
- pick+claim **before** launching (so per-task model/think are fixed at `claude -p` launch).
- fleet tiers (workers claim only their model alias); graceful-stop sentinel; startup recovery via the reaper.
- writes `runs/*.jsonl` (and ingests to `runs` table); timing via orchlog (kept).
- **its own launchd label + config** so it physically cannot co-run with the old drainer.

---

## 9. Token accounting & scheduling (LAYERED — after core)

> **No API key in use — subscription only.** There is therefore *no* programmatic
> path to the subscription buckets via the Messages API (rubato's existing
> `getClaudeRateLimits` header-probe needs `ANTHROPIC_API_KEY` and is **N/A** here —
> its "Claude Usage" tab shows nothing for this user). The ledger below is the sole
> dependable source; the only possible automated signal is the `/usage` spike, which
> must read the **Claude Code OAuth/subscription session**, not the API.

**Ledger model (dependable, no scraping):**
- Every run appends model-weighted events to `usage_ledger`.
- `remaining(bucket) = limit − Σ(events within the bucket's rolling window)`; events expire at `+window_seconds`.
- `limit_units` + per-model `weights` are **seeded from a manual `/usage` baseline** and **refined on each manual recalibration** (least-surprise fit). The gap from *interactive* (non-orchestrated) burn is closed by those recalibrations.
- Optional `/usage` **spike**: if a reliable local signal is found, it re-anchors the ledger automatically; if not, manual stays the source.

**Scheduler = pure `schedule(task, now, buckets, config)`:**
- *High capacity + near reset* → prefer heavy/high-think/long-context tasks (burn expiring units).
- *Low capacity + distant reset* → throttle parallelism, defer heavy tasks, prefer light models.
- Deterministic + unit-tested; the orchestrator consults it for **dispatch timing + concurrency**, never silently changing a user-pinned model.

---

## 10. Triage & epic decomposition (LAYERED — opt-in, last)

- **Triage (opt-in):** a task with blank model/think enters `pending_triage`; a cheap (Haiku) triage call grades complexity and assigns model/think, then → `ready`. Globally toggleable; the triage spend itself is **budget-capped**.
- **Epic decomposition (opt-in):** triage classifies `single` vs `epic`; an epic spawns a cheap planning agent that writes child tasks (`parent_id`) + a first `needs_input` **gateway** with clarification questions in the UI Input Queue. The tree stays `needs_input`; the orchestrator keeps working everything else; answering flips it back to `pending_triage`.
- Both are **conservative-by-default off** and reviewed before trusting (overlaps your manual deep-planning culture).

---

## 11. UI (rubato — "Orchestrator v2", parallel to the old pages)

- **Board** (reads DB): structured, sortable, filterable; lifecycle badges + notes.
- **Builder** (reuse the Task Builder I shipped, repointed to the DB): create/edit by row id (no fragile heading-anchor; no 409s), set status incl. **on-hold/blocked + note**, position, deps/group/recur, model/think.
- **Usage dashboard:** remaining capacity per bucket + reset countdowns + burn-rate; manual baseline/recalibration form.
- **Input Queue:** clarification gateways needing your answer.
- **Override panel:** force model / think / parallel count / autonomy toggles.

---

## 12. Phased plan (each phase has a gate; nothing runs live until its phase)

| Phase | Deliverable | Gate |
|---|---|---|
| **0** | Move this doc → `cwip/taskq/DESIGN.md`; scaffold `cwip/taskq` + `~/.taskq` layout | review |
| **1** | Engine + schema + migrations: eligibility (SQL), atomic claim, leases, recurrence, deps/groups. **Pure, no processes.** | unit tests; no live use |
| **2** | `taskq` CLI (verbs + deterministic `view`) | CLI tests |
| **3** | rubato **Orchestrator v2 UI** (board + builder + lifecycle/notes), reading/writing the DB, mounted **alongside** old pages. *You start queueing real tasks here.* | tsc/lint/test + manual |
| **4** | TS **orchestrator + watchdog wiring** (separate launchd label/config); observe/dry-run first | dry-run clean |
| **5** | One-time **importer** (`TASKS.md` → DB) | round-trip test |
| **6** | **Cutover**: deplete-or-import old → stop old → reaper check → start new | burn-in |
| **7** | Delete old (`drain-queue.sh`/`queue-status.sh`/old pages) | confidence |
| **8** | **Usage ledger + scheduling** (LAYERED) | calibration tests |
| **9** | **Triage** (opt-in) | budget-capped, off by default |
| **10** | **Epic decomposition + Input Queue** (opt-in) | reviewed |
| **spike** | `/usage` programmatic access (non-blocking, any time) | go/no-go |

---

## 13. Risks & open questions

- **`/usage` subscription buckets aren't a public API.** Mitigated by ledger + manual baseline; A is a bonus. (Confirmed: rubato's existing probe reads API-key per-minute headers, not subscription buckets.)
- **Interactive burn is invisible to self-accounting** — closed only by periodic manual recalibration; set a UI nudge to recalibrate.
- **Unit-weighting per model is unpublished** — we fit it from calibrations; treat early numbers as approximate.
- **Triage/planning agents cost tokens to save tokens** — hard budget caps; opt-in.
- ~~Do you use `ANTHROPIC_API_KEY`~~ → **RESOLVED: no — subscription only.** Drop the header-probe path entirely; ledger + manual baseline is the sole telemetry source (see §9).
- ~~DB dir name~~ → **RESOLVED: `~/.taskq/`.**

---

## 14. Cutover runbook (Phase 6)

1. Stop adding to old; finish/deplete old one-shots (or run the importer for remainder).
2. `taskq` importer for standing residue (recur + on-hold + not-ready).
3. Stop old drainer + unload its launchd label; confirm no `[~]`/leases dangling.
4. Run the reaper once; verify `ready` set matches expectation in the v2 board.
5. Load the new launchd label; start orchestrator in low-JOBS observe mode; watch one cycle.
6. Ramp JOBS; monitor usage dashboard.
7. After clean burn-in: Phase 7 delete.
```

---

## 15. Continuous-improvement findings ledger (`findings.ts`, schema v13)

The idempotency backbone for **recurring quality detectors**, so a sweep never
re-flags a choice that was already fixed or deliberately accepted. Without it, every
recurring auditor re-files the same issues each run — noise that buries real
regressions and churns the queue.

**Model.** A `findings` row carries a STABLE `fingerprint` (`findingFingerprint` — a
normalized hash of `type` + `location` + `description`), the issue's `type` /
`location` / `description` / `severity`, a lifecycle `status`
(`open → in_progress → fixed`, or the deliberate terminal `accepted` / `wontfix`),
the `detector` that recorded it, and the linked `fix_task` (FK → `tasks`, `ON DELETE
SET NULL`). `resolved_at` stamps when it closed.

**The UPSERT contract (`recordFinding`).** A detector reports an issue every sweep;
the `fingerprint UNIQUE` constraint makes it idempotent:
- **already present in ANY status → no-op** (`INSERT … ON CONFLICT DO NOTHING`;
  `created: false`). Race-safe across concurrent detectors with no outer txn.
- **genuinely new fingerprint → insert an OPEN finding AND auto-file a focused fix
  task** (`defaultFixTask`, overridable), linked via `fix_task`.

**Resolution.** When the fix task completes, `completeTask` calls
`resolveFindingsForTask` → the finding becomes `fixed` (resolved_at stamped). A
finding can instead be marked `accepted` (the flagged choice is actually optimal) or
`wontfix` (a conscious defer) — by the fix-task worker if it judges the choice
optimal, or by the owner. All three terminal states keep the fingerprint in the
ledger, so the issue is **never re-flagged**, even though no code changed. A genuine
re-introduction produces the same fingerprint and is re-caught (reopen the row).

**Agent/detector interface.** `taskq findings record|ls|show|summary|start|fix|accept|wontfix|reopen`
(see `taskq --help`). `record` prints `{ created, finding, fixTaskId }` so a detector
knows whether it surfaced something new.

**Unifying the recurring auditors.** The standing recurring detectors stop filing
ad-hoc duplicate tasks and instead `taskq findings record` each issue (idempotent),
which auto-files the fix task only for genuinely new findings:

| Detector | `--detector` | typical `type`(s) |
| --- | --- | --- |
| `fu-drift-audit-recurring` | `fu-drift-audit-recurring` | `drift`, `inconsistent-api` |
| `fu-cve-audit` | `fu-cve-audit` | `cve` |
| `fu-log-review` | `fu-log-review` | `weak-ux`, `perf`, `drift` |
| `audit-orchestration-hygiene` | `audit-orchestration-hygiene` | `hygiene`, `inconsistent-api`, `bad-schema` |

**UI.** rubato surfaces the ledger (open findings + severity + status + links to fix
tasks + the summary rollup) so the owner reviews continuous-improvement progress at a
glance.
