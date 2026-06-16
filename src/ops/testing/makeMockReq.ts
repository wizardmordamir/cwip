import { mock } from 'bun:test';
import type { RequestLocals } from '../../core/flow';
import { mergeObjects } from '../../core/object';
import { makeMockLogger } from '.';

export const makeMockRequestLocals = (options = {} as any) => {
  const defaults = {
    config: {},
    logger: makeMockLogger(),
    correlationId: 'mock-corr-id',
    auth: {
      tenantId: 'FLB' as any, // Using FLB as default tenant for tests
      decodedToken: {
        sub: 'mock-user-id',
      },
      token: 'mock-auth-token',
    },
    startPerformance: 0,
    startTime: new Date().toISOString(),
  } as RequestLocals;

  // Allow explicit removal of auth for error testing
  if (options.auth === undefined) {
    const { auth: _auth, ...defaultsWithoutAuth } = defaults;
    return mergeObjects(defaultsWithoutAuth as RequestLocals, options);
  }

  return mergeObjects(defaults, options);
};

export const makeMockReq = (options = {} as any) => {
  const mockReq = {
    headers: {},
    ...options,
    locals: makeMockRequestLocals(options.locals),
  };

  mockReq.get = options.get || mock((key) => mockReq.headers[key]);
  mockReq.on = options.on || mock(() => mockReq);
  mockReq.off = options.off || mock(() => mockReq);

  return mockReq;
};
