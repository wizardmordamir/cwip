import { describe, expect, it } from 'bun:test';
import { poll } from './poll';

describe('poll', () => {
  it('resolves once fn stops throwing', async () => {
    let attempts = 0;
    await poll(
      () => {
        attempts += 1;
        if (attempts < 3) throw new Error('not yet');
      },
      { timeout: 1000, intervals: [1, 1] },
    );
    expect(attempts).toBe(3);
  });

  it('rethrows the last error after the timeout budget', async () => {
    let attempts = 0;
    await expect(
      poll(
        () => {
          attempts += 1;
          throw new Error(`fail-${attempts}`);
        },
        { timeout: 10, intervals: [1] },
      ),
    ).rejects.toThrow(/fail-/);
    expect(attempts).toBeGreaterThan(0);
  });
});
