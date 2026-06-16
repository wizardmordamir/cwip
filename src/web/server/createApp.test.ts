import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AppError } from '../../core/error';
import { corsWhitelist, createApp, errorHandler, securityHeaders } from '.';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp({
    requestLogger: { log: () => {} },
    routes: (a) => {
      a.get('/api/ok', (_req, res) => {
        res.json({ ok: true });
      });
      a.get('/api/boom', () => {
        throw new AppError('teapot', { code: 'TEAPOT', status: 418, category: 'demo' });
      });
    },
    health: { checks: [{ name: 'always-ok', check: () => {} }] },
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

describe('createApp (integration)', () => {
  it('serves routes and sets security headers', async () => {
    const res = await fetch(`${base}/api/ok`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });

  it('maps a thrown AppError to its status + canonical summary', async () => {
    const res = await fetch(`${base}/api/boom`);
    expect(res.status).toBe(418);
    const body = await res.json();
    expect(body.error).toMatchObject({
      name: 'AppError',
      message: 'teapot',
      code: 'TEAPOT',
      status: 418,
      category: 'demo',
      isOperational: true,
    });
    expect(body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('serves liveness and readiness', async () => {
    expect((await fetch(`${base}/health/liveness`)).status).toBe(200);
    const ready = await fetch(`${base}/health/readiness`);
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unmatched routes', async () => {
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toContain('Not found');
  });
});

describe('readiness with a failing check', () => {
  it('returns 503 with the failures', async () => {
    const app = createApp({
      health: {
        checks: [
          {
            name: 'db',
            check: () => {
              throw new Error('connection refused');
            },
          },
        ],
      },
    });
    const srv = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = (srv.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/health/readiness`);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('unavailable');
    expect(body.failures[0].name).toBe('db');
    expect(body.failures[0].error).toContain('connection refused');
    srv.close();
  });
});

describe('unit middleware', () => {
  it('securityHeaders can disable CSP', () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    };
    securityHeaders({ contentSecurityPolicy: false })({} as never, res as never, () => undefined);
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('errorHandler hides the message for generic errors unless exposed', () => {
    const capture = () => {
      let status = 0;
      let body: unknown;
      const res = {
        status(c: number) {
          status = c;
          return this;
        },
        json(b: unknown) {
          body = b;
          return this;
        },
      };
      return { res, get: () => ({ status, body }) };
    };
    const hidden = capture();
    errorHandler()(new Error('secret db dsn'), {} as never, hidden.res as never, () => undefined);
    const got = hidden.get() as { status: number; body: { error: Record<string, unknown> } };
    expect(got.status).toBe(500);
    expect(got.body.error).toMatchObject({
      name: 'Error',
      message: 'Internal Server Error',
      status: 500,
      isOperational: false,
    });
    expect(got.body.error.message).not.toContain('secret');

    const shown = capture();
    errorHandler({ exposeMessage: true })(new Error('boom'), {} as never, shown.res as never, () => undefined);
    expect((shown.get().body as { error: { message: string } }).error.message).toBe('boom');
  });

  it('corsWhitelist resolves the cors peer and returns middleware', () => {
    expect(typeof corsWhitelist({ whitelist: ['https://a.com'] })).toBe('function');
  });
});
