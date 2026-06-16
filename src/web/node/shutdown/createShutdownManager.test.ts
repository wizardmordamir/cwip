import { describe, expect, it } from 'bun:test';
import { createShutdownManager } from '.';

describe('createShutdownManager', () => {
  it('runs all registered callbacks once', async () => {
    const order: string[] = [];
    const mgr = createShutdownManager();
    mgr.register(() => {
      order.push('a');
    });
    mgr.register(async () => {
      order.push('b');
    });
    await mgr.shutdown();
    expect(order.sort()).toEqual(['a', 'b']);
    expect(mgr.isShuttingDown).toBe(true);
  });

  it('is idempotent — a second shutdown() does not re-run callbacks', async () => {
    let calls = 0;
    const mgr = createShutdownManager();
    mgr.register(() => {
      calls++;
    });
    await mgr.shutdown();
    await mgr.shutdown();
    expect(calls).toBe(1);
  });

  it('reports a throwing callback via onError without stopping the others', async () => {
    const errors: unknown[] = [];
    let ran = false;
    const mgr = createShutdownManager({ onError: (e) => errors.push(e) });
    mgr.register(() => {
      throw new Error('cleanup failed');
    });
    mgr.register(() => {
      ran = true;
    });
    await mgr.shutdown();
    expect((errors[0] as Error).message).toBe('cleanup failed');
    expect(ran).toBe(true);
  });

  it('register returns an unregister function', async () => {
    let calls = 0;
    const mgr = createShutdownManager();
    const off = mgr.register(() => {
      calls++;
    });
    off();
    await mgr.shutdown();
    expect(calls).toBe(0);
  });

  it('resolves even if a callback hangs, bounded by timeoutMs', async () => {
    const mgr = createShutdownManager({ timeoutMs: 20 });
    mgr.register(() => new Promise(() => {})); // never resolves
    await mgr.shutdown(); // should resolve via the timeout, not hang
    expect(mgr.isShuttingDown).toBe(true);
  });
});
