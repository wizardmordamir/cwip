import { describe, expect, it } from 'bun:test';
import { AppError, NotFoundError, toErrorEnvelope } from '.';

describe('toErrorEnvelope', () => {
  it('serializes an AppError as the canonical { error } envelope', () => {
    const env = toErrorEnvelope(new NotFoundError('User not found', { context: { userId: 'u1' } }));
    expect(env).toEqual({
      error: {
        name: 'NotFoundError',
        message: 'User not found',
        code: 'NOT_FOUND',
        status: 404,
        category: 'not_found',
        context: { userId: 'u1' },
        isOperational: true,
        timestamp: env.error.timestamp,
      },
    });
    expect(env.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('attaches correlationId at the top level when provided', () => {
    const env = toErrorEnvelope(new AppError('x'), { correlationId: 'abc' });
    expect(env.correlationId).toBe('abc');
    expect(env.error.name).toBe('AppError');
  });

  it('hides a generic error message behind a 500 by default', () => {
    const env = toErrorEnvelope(new Error('secret db dsn leaked'));
    expect(env.error.status).toBe(500);
    expect(env.error.message).toBe('Internal Server Error');
    expect(env.error.isOperational).toBe(false);
    expect(env.error.name).toBe('Error');
  });

  it('exposes a generic error message when exposeMessage is set', () => {
    const env = toErrorEnvelope(new Error('boom'), { exposeMessage: true });
    expect(env.error.message).toBe('boom');
  });

  it('honors a numeric status/statusCode on a non-AppError', () => {
    expect(toErrorEnvelope({ status: 418 }).error.status).toBe(418);
    expect(toErrorEnvelope({ statusCode: 502 }).error.status).toBe(502);
  });
});
