import { describe, expect, it } from 'bun:test';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '.';

describe('httpErrors', () => {
  const cases: Array<[new (m?: string, o?: any) => AppError, number, string, string]> = [
    [BadRequestError, 400, 'BAD_REQUEST', 'request'],
    [UnauthorizedError, 401, 'UNAUTHORIZED', 'auth'],
    [ForbiddenError, 403, 'FORBIDDEN', 'auth'],
    [NotFoundError, 404, 'NOT_FOUND', 'not_found'],
    [ConflictError, 409, 'CONFLICT', 'conflict'],
    [ValidationError, 422, 'VALIDATION_ERROR', 'validation'],
    [RateLimitError, 429, 'RATE_LIMITED', 'rate_limit'],
  ];

  for (const [Ctor, status, code, category] of cases) {
    it(`${Ctor.name} bakes in status/code/category and stays an AppError`, () => {
      const err = new Ctor('boom');
      expect(err).toBeInstanceOf(AppError);
      expect(isAppError(err)).toBe(true);
      expect(err.name).toBe(Ctor.name);
      expect(err.message).toBe('boom');
      expect(err.status).toBe(status);
      expect(err.code).toBe(code);
      expect(err.category).toBe(category);
      expect(err.isOperational).toBe(true);
    });
  }

  it('uses a sensible default message and lets options override status/code/context', () => {
    expect(new NotFoundError().message).toBe('Not Found');
    const err = new ValidationError('bad form', { status: 400, context: { fields: ['email'] } });
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.context).toEqual({ fields: ['email'] });
  });
});
