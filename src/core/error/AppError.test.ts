import { afterEach, describe, expect, it } from 'bun:test';
import { AppError, clearErrorHooks, isAppError, registerErrorHook } from '.';

afterEach(() => {
  clearErrorHooks();
});

describe('AppError', () => {
  it('carries structured fields and defaults isOperational to true', () => {
    const err = new AppError('User not found', {
      code: 'NOT_FOUND',
      status: 404,
      category: 'lookup',
      context: { userId: 'u1' },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('User not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.category).toBe('lookup');
    expect(err.context).toEqual({ userId: 'u1' });
    expect(err.isOperational).toBe(true);
    expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('supports cause chaining and isOperational:false', () => {
    const cause = new Error('socket hang up');
    const err = new AppError('Upstream failed', { cause, isOperational: false });
    expect(err.cause).toBe(cause);
    expect(err.isOperational).toBe(false);
  });

  it('subclasses keep their own name and still fire hooks', () => {
    const seen: string[] = [];
    registerErrorHook((e) => seen.push(e.name));
    class PaymentError extends AppError {}
    const err = new PaymentError('declined', { code: 'CARD_DECLINED' });
    expect(err.name).toBe('PaymentError');
    expect(isAppError(err)).toBe(true);
    expect(seen).toEqual(['PaymentError']);
  });

  it('getSummary / toJSON produce a flat serializable view omitting unset fields', () => {
    const err = new AppError('bad', { code: 'BAD' });
    const summary = err.getSummary();
    expect(summary).toMatchObject({ name: 'AppError', message: 'bad', code: 'BAD', isOperational: true });
    expect(summary.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // status/category/context omitted when unset; timestamp always present.
    expect(Object.keys(summary).sort()).toEqual(['code', 'isOperational', 'message', 'name', 'timestamp']);
    expect(JSON.parse(JSON.stringify(err))).toEqual(summary);
  });
});

describe('error hooks', () => {
  it('fire on every construction and unregister cleanly', () => {
    let count = 0;
    const off = registerErrorHook(() => count++);
    new AppError('a');
    new AppError('b');
    expect(count).toBe(2);
    off();
    new AppError('c');
    expect(count).toBe(2);
  });

  it('a throwing hook never breaks construction', () => {
    registerErrorHook(() => {
      throw new Error('instrumentation down');
    });
    // Constructs fine despite the throwing hook (asserted via the result, since
    // Bun's toThrow treats a *returned* Error instance as a throw).
    const err = new AppError('still works');
    expect(err.message).toBe('still works');
  });
});
