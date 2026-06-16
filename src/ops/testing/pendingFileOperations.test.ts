import { describe, expect, it } from 'bun:test';
import { createPendingFileOperations } from './pendingFileOperations';

describe('createPendingFileOperations', () => {
  it('tracks in-flight ops and waits for them on shutdown', async () => {
    const pending = createPendingFileOperations();
    let done = false;
    pending.add(
      new Promise<void>((resolve) =>
        setTimeout(() => {
          done = true;
          resolve();
        }, 5),
      ),
    );
    expect(pending.size()).toBe(1);
    await pending.shutdown();
    expect(done).toBe(true);
    expect(pending.size()).toBe(0);
  });

  it('ignores new ops after shutdown', async () => {
    const pending = createPendingFileOperations();
    await pending.shutdown();
    pending.add(Promise.resolve());
    expect(pending.size()).toBe(0);
  });
});
