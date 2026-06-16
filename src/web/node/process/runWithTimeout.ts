import { spawn } from 'node:child_process';

export interface RunWithTimeoutOptions {
  /** Kill the command after this many ms (default 5000). */
  timeoutMs?: number;
  /** After SIGTERM on timeout, wait this long before SIGKILL (default 2000). */
  killGraceMs?: number;
  /** Working directory for the command. */
  cwd?: string;
  /** Environment for the command (defaults to the parent's). */
  env?: NodeJS.ProcessEnv;
  /** stdio mode (default 'inherit' so output streams through). */
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

export interface RunWithTimeoutResult {
  /** True if the command was killed for exceeding `timeoutMs`. */
  timedOut: boolean;
  /** The command's exit code, or null if it was killed by a signal. */
  code: number | null;
  /** The signal that killed the command, if any. */
  signal: NodeJS.Signals | null;
  /** A spawn failure (e.g. ENOENT) — distinct from a non-zero exit code. */
  error?: Error;
}

/**
 * Run a command (argv array, no shell — injection-safe) and kill it if it runs
 * longer than `timeoutMs`, so a hung step can't wedge a build/clean. On timeout
 * it sends SIGTERM, then SIGKILL after `killGraceMs` if the child ignores it.
 *
 * Never throws and never exits the process: it resolves a result you branch on
 * (mirrors `git()`'s house style). A missing binary resolves with `error` set
 * (not a non-zero `code`); the child's real exit code is preserved otherwise.
 *
 *   const r = await runWithTimeout(['bun', 'x', 'rm', '-rf', 'dist'], { timeoutMs: 3000 });
 *   if (r.timedOut) … ; else if (r.error) … ; else process.exitCode = r.code ?? 0;
 */
export const runWithTimeout = (
  command: string[],
  options: RunWithTimeoutOptions = {},
): Promise<RunWithTimeoutResult> => {
  const { timeoutMs = 5000, killGraceMs = 2000, cwd, env, stdio = 'inherit' } = options;

  return new Promise<RunWithTimeoutResult>((resolveResult) => {
    const [cmd, ...args] = command;
    if (!cmd) {
      resolveResult({ timedOut: false, code: null, signal: null, error: new Error('No command specified') });
      return;
    }

    const child = spawn(cmd, args, { cwd, env, stdio, shell: false });
    let timedOut = false;
    let settled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      // Escalate if the child ignores SIGTERM within the grace window.
      killTimer = setTimeout(() => child.kill('SIGKILL'), killGraceMs);
      killTimer.unref?.();
    }, timeoutMs);
    timer.unref?.();

    const settle = (result: RunWithTimeoutResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      resolveResult(result);
    };

    // 'error' fires for spawn failures (ENOENT etc.); 'close' for a real exit.
    child.on('error', (error) => settle({ timedOut, code: null, signal: null, error }));
    child.on('close', (code, signal) => settle({ timedOut, code, signal }));
  });
};
