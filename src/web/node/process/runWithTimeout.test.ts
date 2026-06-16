import { describe, expect, it } from 'bun:test';
import { runWithTimeout } from '.';

describe('runWithTimeout', () => {
  it('resolves with the exit code for a command that finishes in time', async () => {
    expect(await runWithTimeout(['sh', '-c', 'exit 0'], { stdio: 'ignore' })).toMatchObject({
      timedOut: false,
      code: 0,
    });
    expect(await runWithTimeout(['sh', '-c', 'exit 3'], { stdio: 'ignore' })).toMatchObject({
      timedOut: false,
      code: 3,
    });
  });

  it('kills and flags a command that exceeds the timeout', async () => {
    const result = await runWithTimeout(['sh', '-c', 'sleep 5'], {
      timeoutMs: 50,
      killGraceMs: 50,
      stdio: 'ignore',
    });
    expect(result.timedOut).toBe(true);
  });

  it('surfaces a spawn failure as `error`, not a non-zero code', async () => {
    const result = await runWithTimeout(['cwip-no-such-binary-zzz'], { stdio: 'ignore' });
    expect(result.error).toBeInstanceOf(Error);
    expect(result.code).toBeNull();
  });

  it('returns an error for an empty command', async () => {
    expect((await runWithTimeout([])).error).toBeInstanceOf(Error);
  });
});
