import { describe, expect, it } from 'bun:test';
import { makeMockReq, makeMockRes } from '../../ops/testing';
import { rateLimit } from './rateLimit';

const run = (mw: ReturnType<typeof rateLimit>, req: any) => {
  const res = makeMockRes();
  let nexted = false;
  mw(
    req,
    res as any,
    (() => {
      nexted = true;
    }) as any,
  );
  return { res, nexted };
};

describe('rateLimit', () => {
  it('allows up to max requests, then blocks with a 429 envelope + Retry-After', () => {
    const mw = rateLimit({ windowMs: 1000, max: 2 });
    const req = makeMockReq({ ip: '1.2.3.4' });

    expect(run(mw, req).nexted).toBe(true);
    expect(run(mw, req).nexted).toBe(true);

    const blocked = run(mw, req);
    expect(blocked.nexted).toBe(false);
    expect(blocked.res.status).toHaveBeenCalledWith(429);
    expect(blocked.res.headers['Retry-After']).toBeDefined();

    const envelope = blocked.res.json.mock.calls[0][0];
    expect(envelope.error.status).toBe(429);
    expect(envelope.error.code).toBe('RATE_LIMITED');
  });

  it('isolates counts per key', () => {
    const mw = rateLimit({ windowMs: 1000, max: 1 });
    expect(run(mw, makeMockReq({ ip: 'a' })).nexted).toBe(true);
    expect(run(mw, makeMockReq({ ip: 'a' })).nexted).toBe(false);
    // a different key still has its full allowance
    expect(run(mw, makeMockReq({ ip: 'b' })).nexted).toBe(true);
  });

  it('surfaces req.correlationId in the envelope and honors message + keyFn', () => {
    const mw = rateLimit({ windowMs: 1000, max: 0, message: 'slow down', keyFn: () => 'shared' });
    const { res } = run(mw, makeMockReq({ correlationId: 'abc123' }));
    const envelope = res.json.mock.calls[0][0];
    expect(envelope.error.message).toBe('slow down');
    expect(envelope.correlationId).toBe('abc123');
  });

  it('skip() exempts a request entirely', () => {
    const mw = rateLimit({ windowMs: 1000, max: 0, skip: (req) => (req as any).exempt === true });
    expect(run(mw, makeMockReq({ exempt: true })).nexted).toBe(true);
    expect(run(mw, makeMockReq({ exempt: false })).nexted).toBe(false);
  });

  it('honors a custom statusCode and a handler escape hatch', () => {
    const seen: number[] = [];
    const mw = rateLimit({
      windowMs: 1000,
      max: 0,
      statusCode: 503,
      handler: (_req, res, _next, info) => {
        seen.push(info.retryAfter);
        res.status(503).json({ custom: true });
      },
    });
    const { res } = run(mw, makeMockReq({ ip: 'h' }));
    expect(seen.length).toBe(1);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0]).toEqual({ custom: true });
  });
});
