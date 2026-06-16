import { describe, expect, it } from 'bun:test';
import { runWithTimeoutCli } from '.';

describe('runWithTimeoutCli', () => {
  it('returns 2 when no command is given', async () => {
    expect(await runWithTimeoutCli([])).toBe(2);
  });

  it('passes through the command exit code', async () => {
    expect(await runWithTimeoutCli(['sh', '-c', 'exit 0'])).toBe(0);
    expect(await runWithTimeoutCli(['sh', '-c', 'exit 4'])).toBe(4);
  });

  it('returns 1 when the command times out (leading numeric arg = ms)', async () => {
    expect(await runWithTimeoutCli(['50', 'sh', '-c', 'sleep 5'])).toBe(1);
  });

  it('returns 127 for a missing command', async () => {
    expect(await runWithTimeoutCli(['cwip-no-such-binary-zzz'])).toBe(127);
  });
});
