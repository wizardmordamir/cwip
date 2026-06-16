import { describe, expect, it } from 'bun:test';
import { makeMockReq, makeMockRes } from '../../ops/testing';
import { correlationId } from './correlationId';

const run = (mw: ReturnType<typeof correlationId>, req: any) => {
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

describe('correlationId', () => {
  it('generates an id, stashes it on the request, echoes it, and calls next', () => {
    const req = makeMockReq({});
    const { res, nexted } = run(correlationId(), req);
    expect(nexted).toBe(true);
    expect(typeof req.correlationId).toBe('string');
    expect(req.correlationId.length).toBeGreaterThan(0);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
  });

  it('reuses an inbound correlation-id header', () => {
    const req = makeMockReq({ headers: { 'x-correlation-id': 'inbound99' } });
    const { res } = run(correlationId(), req);
    expect(req.correlationId).toBe('inbound99');
    expect(res.headers['x-correlation-id']).toBe('inbound99');
  });

  it('honors a custom property, generator, and echo:false', () => {
    const req = makeMockReq({});
    const { res } = run(correlationId({ property: 'reqId', generate: () => 'fixed', echo: false }), req);
    expect(req.reqId).toBe('fixed');
    expect(res.headers['x-correlation-id']).toBeUndefined();
  });

  it('reads one header but echoes on a different responseHeader', () => {
    const req = makeMockReq({ headers: { 'x-request-id': 'rid-1' } });
    const { res } = run(correlationId({ header: 'x-request-id', responseHeader: 'x-correlation-id' }), req);
    expect(req.correlationId).toBe('rid-1');
    expect(res.headers['x-correlation-id']).toBe('rid-1');
  });

  it('trustInbound:false always mints, ignoring an inbound id', () => {
    const req = makeMockReq({ headers: { 'x-correlation-id': 'attacker' } });
    run(correlationId({ trustInbound: false, generate: () => 'fresh' }), req);
    expect(req.correlationId).toBe('fresh');
  });

  it('trustInbound predicate accepts only valid inbound ids', () => {
    const onlyShort = correlationId({ trustInbound: (v) => v.length <= 8, generate: () => 'minted' });
    const ok = makeMockReq({ headers: { 'x-correlation-id': 'short' } });
    const tooLong = makeMockReq({ headers: { 'x-correlation-id': 'this-is-way-too-long' } });
    run(onlyShort, ok);
    run(onlyShort, tooLong);
    expect(ok.correlationId).toBe('short');
    expect(tooLong.correlationId).toBe('minted');
  });
});
