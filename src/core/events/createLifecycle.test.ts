import { describe, expect, it } from 'bun:test';
import { createLifecycle } from '.';

type Events = {
  'user:before-delete': { userId: string };
  'app:start': { at: number };
};

describe('createLifecycle', () => {
  it('runs handlers in registration order and collects after-commit callbacks', () => {
    const lc = createLifecycle<Events>();
    const order: string[] = [];
    lc.on('user:before-delete', ({ userId }) => {
      order.push(`cleanup:${userId}`);
      return () => order.push(`notify:${userId}`);
    });
    lc.on('user:before-delete', () => {
      order.push('audit');
    });

    const after = lc.run('user:before-delete', { userId: 'u1' });
    expect(order).toEqual(['cleanup:u1', 'audit']);
    expect(lc.handlerCount('user:before-delete')).toBe(2);

    lc.runAfter(after);
    expect(order).toEqual(['cleanup:u1', 'audit', 'notify:u1']);
  });

  it('propagates a handler throw from run (so a txn can roll back)', () => {
    const lc = createLifecycle<Events>();
    lc.on('app:start', () => {
      throw new Error('handler failed');
    });
    expect(() => lc.run('app:start', { at: 1 })).toThrow('handler failed');
  });

  it('runAfter never throws and routes errors to onAfterError', () => {
    const errors: unknown[] = [];
    const lc = createLifecycle<Events>({ onAfterError: (e) => errors.push(e) });
    lc.on('app:start', () => () => {
      throw new Error('after boom');
    });
    const after = lc.run('app:start', { at: 1 });
    expect(() => lc.runAfter(after)).not.toThrow();
    expect((errors[0] as Error).message).toBe('after boom');
  });

  it('on returns an unsubscribe', () => {
    const lc = createLifecycle<Events>();
    const off = lc.on('app:start', () => {});
    expect(lc.handlerCount('app:start')).toBe(1);
    off();
    expect(lc.handlerCount('app:start')).toBe(0);
  });
});
