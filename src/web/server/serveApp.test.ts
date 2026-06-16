import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { type ServedApp, serveApp } from '.';

// NOTE: cwip's test preload virtualizes node:fs (scripts/testSetup →
// enableSystemMocks), so the static-file/SPA-fallback paths (express.static +
// res.sendFile) can't be observed here — same convention as testReport.test.ts.
// We assert the wiring that doesn't touch the filesystem: routes, health, the
// JSON 404 (proving static doesn't swallow unmatched /api), and shutdown. The
// real static/SPA serving is exercised against a real fs in the app testkits.

let served: ServedApp;
let base: string;

beforeAll(async () => {
  served = await serveApp({
    port: 0,
    handleSignals: false, // don't leak process signal handlers in tests
    requestLogger: { log: () => {} },
    routes: (app) => {
      app.get('/api/ok', (_req, res) => {
        res.json({ ok: true });
      });
    },
    static: { dir: '/tmp/cwip-spa-does-not-need-to-exist' },
    health: { checks: [{ name: 'always', check: () => {} }] },
  });
  const { port } = served.server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await served.shutdown.shutdown();
});

describe('serveApp', () => {
  it('serves API routes', async () => {
    const res = await fetch(`${base}/api/ok`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('mounts liveness + readiness', async () => {
    expect((await fetch(`${base}/health/liveness`)).status).toBe(200);
    expect((await fetch(`${base}/health/readiness`)).status).toBe(200);
  });

  it('returns the JSON 404 for an unmatched API path (static SPA fallback skips /api)', async () => {
    const res = await fetch(`${base}/api/nope`, { headers: { accept: 'text/html' } });
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type') ?? '').toContain('application/json');
  });

  it('shutdown() closes the server and is idempotent', async () => {
    await served.shutdown.shutdown();
    expect(served.shutdown.isShuttingDown).toBe(true);
    await served.shutdown.shutdown(); // second call is a no-op
  });
});
