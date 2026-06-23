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
