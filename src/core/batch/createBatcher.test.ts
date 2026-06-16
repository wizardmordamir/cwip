import { describe, expect, it } from 'bun:test';
import { createBatcher } from '.';

describe('createBatcher', () => {
  it('flushes on the size threshold', async () => {
    const batches: number[][] = [];
    const batcher = createBatcher<number>({
      onFlush: (items) => {
        batches.push(items);
      },
      maxSize: 3,
    });
    batcher.add(1);
    batcher.add(2);
    expect(batches).toHaveLength(0);
    batcher.add(3); // hits maxSize
    await Promise.resolve();
    expect(batches).toEqual([[1, 2, 3]]);
    expect(batcher.size).toBe(0);
  });

  it('flushes remaining items on stop()', async () => {
    const batches: number[][] = [];
    const batcher = createBatcher<number>({
      onFlush: (items) => {
        batches.push(items);
      },
      maxSize: 100,
    });
    batcher.addMany([1, 2]);
    expect(batcher.size).toBe(2);
    await batcher.stop();
    expect(batches).toEqual([[1, 2]]);
  });

  it('explicit flush is a no-op when empty', async () => {
    let calls = 0;
    const batcher = createBatcher<number>({
      onFlush: () => {
        calls++;
      },
    });
    await batcher.flush();
    expect(calls).toBe(0);
  });

  it('routes a failing onFlush to onError and drops the batch', async () => {
    const errors: unknown[] = [];
    const batcher = createBatcher<number>({
      onFlush: () => {
        throw new Error('insert failed');
      },
      onError: (err) => errors.push(err),
    });
    batcher.add(1);
    await batcher.flush();
    expect((errors[0] as Error).message).toBe('insert failed');
    expect(batcher.size).toBe(0);
  });
});
