import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CaptureRecord } from '../../../core/capture';
import { fileCaptureSink } from '.';

// node:fs/promises is NOT part of cwip's global system mocks, so these writes
// hit the real FS — exercise the sink against a real temp directory.
let dir: string;

const record = (label: string, n: number): CaptureRecord => ({
  label,
  kind: 'db',
  timestamp: '2026-01-01T00:00:00.000Z',
  durationMs: n,
  request: { n },
  response: { ok: true },
});

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cwip-capture-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('fileCaptureSink', () => {
  it('appends records to <dir>/<label>.json as a growing array', async () => {
    const sink = fileCaptureSink(dir);
    await sink(record('list-users', 1));
    await sink(record('list-users', 2));

    const written = JSON.parse(await readFile(join(dir, 'list-users.json'), 'utf8'));
    expect(Array.isArray(written)).toBe(true);
    expect(written).toHaveLength(2);
    expect(written[0].request).toEqual({ n: 1 });
    expect(written[1].request).toEqual({ n: 2 });
  });

  it('serializes concurrent writes to the same label without losing records', async () => {
    const sink = fileCaptureSink(dir);
    await Promise.all(Array.from({ length: 20 }, (_, i) => sink(record('concurrent', i))));

    const written = JSON.parse(await readFile(join(dir, 'concurrent.json'), 'utf8'));
    expect(written).toHaveLength(20);
    expect(new Set(written.map((r: CaptureRecord) => (r.request as { n: number }).n)).size).toBe(20);
  });

  it('sanitizes unsafe labels into a single file name', async () => {
    const sink = fileCaptureSink(dir);
    await sink(record('../weird/ name', 1));
    const written = JSON.parse(await readFile(join(dir, '_weird_name.json'), 'utf8'));
    expect(written).toHaveLength(1);
  });
});
