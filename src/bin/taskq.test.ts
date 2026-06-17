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
