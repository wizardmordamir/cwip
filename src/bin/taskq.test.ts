import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Smoke-test the `taskq` CLI end to end by spawning it against an isolated DB.
const BIN = new URL('./taskq.ts', import.meta.url).pathname;
let dir: string;
let env: Record<string, string>;

function run(...args: string[]): { code: number | null; stdout: string; stderr: string } {
  const r = Bun.spawnSync(['bun', BIN, ...args], { env });
  return { code: r.exitCode, stdout: r.stdout.toString(), stderr: r.stderr.toString() };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'taskq-cli-'));
  env = { ...process.env, TASKQ_HOME: dir, TASKQ_DB: join(dir, 'taskq.sqlite') } as Record<string, string>;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test('add → ls → claim-next → complete → view round-trips', () => {
  const add = run('add', 'first task', '--model', 'sonnet', '--slug', 'one');
  expect(add.code).toBe(0);
  const id = JSON.parse(add.stdout).id as number;
  expect(id).toBeGreaterThan(0);

  run('add', 'second', '--pos', 'bottom', '--needs', 'one');

  const ls = JSON.parse(run('ls', '--json').stdout) as unknown[];
  expect(ls.length).toBe(2);

  // claim-next gets the topmost eligible (the dep 'one' is not done → 'second' blocked).
  const claimed = JSON.parse(run('claim-next', '--worker', 'w1').stdout) as { id: number; title: string };
  expect(claimed.title).toBe('first task');

  expect(run('complete', String(claimed.id), '--commit', 'abc1234').code).toBe(0);

  // Now 'second' is unblocked (its dep is done).
  const next = JSON.parse(run('next').stdout) as { title: string } | null;
  expect(next?.title).toBe('second');

  const view = run('view');
  expect(view.stdout).toContain('# taskq board');
  expect(view.stdout).toContain('first task');
});

test('rejects an invalid task (nonzero exit + message)', () => {
  const r = run('add', 'bad', '--model', 'gpt');
  expect(r.code).toBe(1);
  expect(r.stderr).toContain('unknown model');
});

test('--noop-ok sets the flag on add; --noop-ok false clears it on update', () => {
  const id = (JSON.parse(run('add', 'audit task', '--noop-ok').stdout) as { id: number }).id;
  expect((JSON.parse(run('show', String(id), '--json').stdout) as { noop_ok: number }).noop_ok).toBe(1);

  run('update', String(id), '--noop-ok', 'false');
  expect((JSON.parse(run('show', String(id), '--json').stdout) as { noop_ok: number }).noop_ok).toBe(0);

  // A plain task defaults to 0.
  const plain = (JSON.parse(run('add', 'code change').stdout) as { id: number }).id;
  expect((JSON.parse(run('show', String(plain), '--json').stdout) as { noop_ok: number }).noop_ok).toBe(0);
});

test('hold / unhold flips status', () => {
  const id = (JSON.parse(run('add', 'holdme').stdout) as { id: number }).id;
  run('hold', String(id), '--note', 'waiting');
  expect((JSON.parse(run('show', String(id), '--json').stdout) as { status: string }).status).toBe('on_hold');
  run('unhold', String(id));
  expect((JSON.parse(run('show', String(id), '--json').stdout) as { status: string }).status).toBe('ready');
});

test('hold stamps a needs_owner disposition; unhold clears it; show exposes retry_at', () => {
  const id = (JSON.parse(run('add', 'disp').stdout) as { id: number }).id;
  run('hold', String(id), '--note', 'waiting on a decision');
  let shown = JSON.parse(run('show', String(id), '--json').stdout) as {
    hold_disposition: string | null;
    resolver_ref: string | null;
    retry_at: number | null;
  };
  expect(shown.hold_disposition).toBe('needs_owner'); // a manual hold never strands silently
  expect(shown.retry_at).toBeNull();
  run('unhold', String(id));
  shown = JSON.parse(run('show', String(id), '--json').stdout) as typeof shown;
  expect(shown.hold_disposition).toBeNull();
});

test('status --disposition + --resolver parks with a resolver; ls --needs-owner filters', () => {
  const owner = (JSON.parse(run('add', 'needs-a-human').stdout) as { id: number }).id;
  run('status', String(owner), 'not_ready'); // parked → needs_owner default

  const awaited = (JSON.parse(run('add', 'awaits-heal').stdout) as { id: number }).id;
  run('status', String(awaited), 'on_hold', '--disposition', 'awaiting_task', '--resolver', 'heal-ru-integration');
  const shown = JSON.parse(run('show', String(awaited), '--json').stdout) as {
    hold_disposition: string;
    resolver_ref: string;
  };
  expect(shown.hold_disposition).toBe('awaiting_task');
  expect(shown.resolver_ref).toBe('heal-ru-integration');

  // --needs-owner returns the human-actionable hold but NOT the awaiting_task one.
  const owners = JSON.parse(run('ls', '--needs-owner', '--json').stdout) as { id: number }[];
  const ids = owners.map((t) => t.id);
  expect(ids).toContain(owner);
  expect(ids).not.toContain(awaited);

  // A bad disposition is rejected with a clear message.
  const bad = run('status', String(owner), 'on_hold', '--disposition', 'whoops');
  expect(bad.code).toBe(1);
  expect(bad.stderr).toContain('bad --disposition');
});

test('findings record is idempotent, auto-files a fix task, and a completion resolves the finding', () => {
  const rec = JSON.parse(
    run(
      'findings',
      'record',
      '--type',
      'drift',
      '--location',
      'src/cli/example.ts',
      '--description',
      'a recurring smell',
      '--severity',
      'high',
      '--detector',
      'fu-drift-audit-recurring',
      '--repo',
      'cwip',
    ).stdout,
  ) as { created: boolean; finding: { id: number; status: string }; fixTaskId: number };
  expect(rec.created).toBe(true);
  expect(rec.finding.status).toBe('open');
  expect(rec.fixTaskId).toBeGreaterThan(0);
  // The auto-filed fix task targets the detector's repo.
  expect((JSON.parse(run('show', String(rec.fixTaskId), '--json').stdout) as { repo: string }).repo).toBe('cwip');

  // Recording the SAME issue again is a no-op (no duplicate, no second task).
  const again = JSON.parse(
    run(
      'findings',
      'record',
      '--type',
      'drift',
      '--location',
      'src/cli/example.ts',
      '--description',
      'a recurring smell',
    ).stdout,
  ) as { created: boolean; finding: { id: number } };
  expect(again.created).toBe(false);
  expect(again.finding.id).toBe(rec.finding.id);
  expect((JSON.parse(run('findings', 'ls', '--json').stdout) as unknown[]).length).toBe(1);

  // Completing the fix task auto-resolves the finding → fixed.
  run('claim', String(rec.fixTaskId), '--worker', 'w1');
  run('complete', String(rec.fixTaskId), '--commit', 'deadbee');
  expect(
    (JSON.parse(run('findings', 'show', String(rec.finding.id), '--json').stdout) as { status: string }).status,
  ).toBe('fixed');

  // summary reflects the ledger.
  const summary = JSON.parse(run('findings', 'summary', '--json').stdout) as {
    total: number;
    byStatus: Record<string, number>;
  };
  expect(summary.total).toBe(1);
  expect(summary.byStatus.fixed).toBe(1);
});

test('findings accept marks a finding terminal so it is never re-flagged', () => {
  const rec = JSON.parse(
    run('findings', 'record', '--type', 'weak-ux', '--location', 'ui/x.tsx', '--description', 'minor nit', '--no-task')
      .stdout,
  ) as { fixTaskId: number | null; finding: { id: number } };
  expect(rec.fixTaskId).toBeNull(); // --no-task suppressed the fix task

  run('findings', 'accept', String(rec.finding.id), '--note', 'intentional, optimal as-is');
  const shown = JSON.parse(run('findings', 'show', String(rec.finding.id), '--json').stdout) as {
    status: string;
    note: string;
    resolved_at: string | null;
  };
  expect(shown.status).toBe('accepted');
  expect(shown.note).toBe('intentional, optimal as-is');
  expect(shown.resolved_at).not.toBeNull();

  // Re-recording the same issue stays a no-op and does NOT reopen it.
  run('findings', 'record', '--type', 'weak-ux', '--location', 'ui/x.tsx', '--description', 'minor nit');
  expect(
    (JSON.parse(run('findings', 'show', String(rec.finding.id), '--json').stdout) as { status: string }).status,
  ).toBe('accepted');
});

test('findings record rejects a bad severity', () => {
  const r = run('findings', 'record', '--type', 'cve', '--location', 'a', '--description', 'b', '--severity', 'huge');
  expect(r.code).toBe(1);
  expect(r.stderr).toContain('bad --severity');
});

test('ls --json round-trips a body with special characters (quotes, newlines, backslashes, control chars)', () => {
  // Chars that break hand-built JSON serialization but must be properly escaped by JSON.stringify:
  // double-quotes, backslashes, CR, LF, tab.  Low control chars (0x01-0x1f) can't travel
  // through spawnSync CLI args (OS null-term constraint), so we inject them via a direct DB write.
  const safePart = '"double-quoted" and \\backslash\\ and\nnewline\r\nCRLF\ttab';
  const id = (JSON.parse(run('add', 'special chars task', '--body', safePart).stdout) as { id: number }).id;

  // Inject low control chars directly into the SQLite DB, bypassing CLI arg restrictions.
  const controlBody = `${safePart}\x01\x02\x03\x1f`;
  const dbPath = join(dir, 'taskq.sqlite');
  const injectResult = Bun.spawnSync(
    [
      'bun',
      '-e',
      `import{Database}from'bun:sqlite';const db=new Database(${JSON.stringify(dbPath)});db.run('UPDATE tasks SET body=? WHERE id=?',${JSON.stringify(controlBody)},${id})`,
    ],
    { env },
  );
  expect(injectResult.exitCode).toBe(0);

  const raw = run('ls', '--json').stdout;
  // Must parse without throwing — this is the invariant the hygiene scripts rely on.
  const tasks = JSON.parse(raw) as { id: number; body: string | null }[];
  const found = tasks.find((t) => t.id === id);
  expect(found).toBeDefined();
  // The body must survive the JSON round-trip byte-for-byte.
  expect(found!.body).toBe(controlBody);
});
