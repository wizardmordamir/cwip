import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWorkerPool } from '.';

// Real worker threads need a real file on disk. node:fs/promises is NOT part of
// cwip's global system mocks (only node:fs is), so these writes hit the real FS.
const SUM_WORKER = `
import { parentPort, workerData } from 'node:worker_threads';
const sum = workerData.items.reduce((a, b) => a + b, 0);
parentPort.postMessage({ sum, size: workerData.items.length, label: workerData.label });
`;

const THROW_WORKER = `
import 'node:worker_threads';
throw new Error('worker boom');
`;

let dir: string;
let sumWorker: string;
let throwWorker: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cwip-worker-pool-'));
  sumWorker = join(dir, 'sum.worker.mjs');
  throwWorker = join(dir, 'throw.worker.mjs');
  await writeFile(sumWorker, SUM_WORKER);
  await writeFile(throwWorker, THROW_WORKER);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runWorkerPool', () => {
  it('fans items across workers and collects each result', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const results = await runWorkerPool<{ sum: number; size: number }>(items, sumWorker, {
      workerCount: 3,
      workerData: (chunk) => ({ items: chunk }),
    });

    expect(results.length).toBe(3); // 6 items / 3 workers => 2 each
    expect(results.reduce((acc, r) => acc + r.sum, 0)).toBe(21);
    expect(results.reduce((acc, r) => acc + r.size, 0)).toBe(6);
  });

  it('passes shared config through workerData and exposes chunk info', async () => {
    const results = await runWorkerPool<{ label: string }>([10, 20], sumWorker, {
      workerCount: 2,
      workerData: (chunk, info) => ({ items: chunk, label: `w${info.index}` }),
    });
    expect(results.map((r) => r.label).sort()).toEqual(['w0', 'w1']);
  });

  it('never spawns more workers than items', async () => {
    const spawned: number[] = [];
    const results = await runWorkerPool<{ sum: number }>([42, 7], sumWorker, {
      workerCount: 25,
      workerData: (chunk) => ({ items: chunk }),
      onSpawn: (info) => spawned.push(info.index),
    });
    expect(spawned.length).toBe(2);
    expect(results.length).toBe(2);
  });

  it('returns [] for empty input without spawning anything', async () => {
    const spawned: number[] = [];
    const results = await runWorkerPool([], sumWorker, { onSpawn: (i) => spawned.push(i.index) });
    expect(results).toEqual([]);
    expect(spawned.length).toBe(0);
  });

  it('rejects when a worker fails', async () => {
    await expect(
      runWorkerPool([1, 2, 3], throwWorker, { workerCount: 2, workerData: (chunk) => ({ items: chunk }) }),
    ).rejects.toThrow(/worker boom/);
  });
});
