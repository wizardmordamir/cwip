import { describe, expect, it } from 'bun:test';
import { httpProbe, probeCheck } from './checks';
import { createHealthRegistry, runHealthChecks, summarizeHealth } from './registry';
import type { HealthCheck, HealthResult } from './types';

const result = (over: Partial<HealthResult> = {}): HealthResult => ({
  id: 'x',
  title: 'X',
  category: 'Test',
  severity: 'error',
  status: 'ok',
  detail: '',
  remediation: [],
  ...over,
});

describe('runHealthChecks', () => {
  it('aggregates results and summary in order', async () => {
    const checks: HealthCheck[] = [
      () => result({ id: 'a', status: 'ok' }),
      async () => result({ id: 'b', status: 'warn' }),
      () => result({ id: 'c', status: 'error' }),
    ];
    const report = await runHealthChecks(checks, { now: '2026-06-13T00:00:00.000Z' });
    expect(report.results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(report.summary).toEqual({ error: 1, warn: 1, info: 0, ok: 1 });
    expect(report.ok).toBe(false);
    expect(report.checkedAt).toBe('2026-06-13T00:00:00.000Z');
  });

  it('ok is true only when no error-status result', async () => {
    const report = await runHealthChecks([() => result({ status: 'warn' })]);
    expect(report.ok).toBe(true);
  });

  it('catches a throwing check instead of failing the whole run', async () => {
    let logged = '';
    const report = await runHealthChecks(
      [
        () => result({ id: 'good', status: 'ok' }),
        () => {
          throw new Error('boom');
        },
      ],
      {
        log: {
          error: (msg: string) => {
            logged = msg;
          },
        },
      },
    );
    expect(report.results[0].id).toBe('good');
    expect(report.results[1].id).toBe('check_failed');
    expect(report.results[1].status).toBe('error');
    expect(report.results[1].detail).toContain('boom');
    expect(logged).toContain('threw');
  });
});

describe('summarizeHealth', () => {
  it('tallies by status', () => {
    expect(summarizeHealth([result({ status: 'ok' }), result({ status: 'ok' }), result({ status: 'error' })])).toEqual({
      error: 1,
      warn: 0,
      info: 0,
      ok: 2,
    });
  });
});

describe('createHealthRegistry', () => {
  it('registers, lists, runs and clears', async () => {
    const reg = createHealthRegistry([() => result({ id: 'seed', status: 'ok' })]);
    reg.register(() => result({ id: 'added', status: 'warn' }));
    expect(reg.list()).toHaveLength(2);
    const report = await reg.run();
    expect(report.results.map((r) => r.id)).toEqual(['seed', 'added']);
    reg.clear();
    expect(reg.list()).toHaveLength(0);
  });
});

describe('probeCheck', () => {
  it('returns ok when the probe resolves', async () => {
    const check = probeCheck({ id: 'db', title: 'DB', probe: async () => {} });
    const r = await check();
    expect(r.status).toBe('ok');
    expect(r.id).toBe('db');
  });

  it('returns the configured severity when the probe throws', async () => {
    const check = probeCheck({
      id: 'cache',
      title: 'Cache',
      severity: 'warn',
      remediation: ['restart it'],
      probe: () => {
        throw new Error('unreachable');
      },
    });
    const r = await check();
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('unreachable');
    expect(r.remediation).toEqual(['restart it']);
  });
});

describe('httpProbe', () => {
  it('passes on a 2xx and throws on a non-ok status', async () => {
    const okProbe = httpProbe('https://example.test/ok', {
      init: {},
    });
    // Stub fetch.
    const realFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response('ok', { status: 200 })) as unknown as typeof fetch;
      await expect(okProbe()).resolves.toBeUndefined();
      globalThis.fetch = (async () => new Response('no', { status: 503 })) as unknown as typeof fetch;
      await expect(httpProbe('https://example.test/down')()).rejects.toThrow('503');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
