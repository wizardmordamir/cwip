import { runWithTimeout } from './runWithTimeout';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * The CLI behind an app's thin `withTimeout` wrapper. Parses `[ms] command...`
 * (a leading all-digits arg is the timeout, else the default 5000ms) and runs it
 * via `runWithTimeout`, returning a process exit code — it does not exit itself
 * (the wrapper does), so it stays testable.
 *
 * Exit codes: 1 on timeout, 127 on a missing command (ENOENT), otherwise the
 * command's own exit code.
 *
 *   bun scripts/withTimeout 3000 bun x rm -rf dist
 */
export const runWithTimeoutCli = async (argv: string[] = process.argv.slice(2)): Promise<number> => {
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let command = argv;
  if (argv[0] !== undefined && /^\d+$/.test(argv[0])) {
    timeoutMs = Number.parseInt(argv[0], 10);
    command = argv.slice(1);
  }

  if (command.length === 0) {
    console.error('withTimeout: usage: [ms] <command...>');
    return 2;
  }

  const result = await runWithTimeout(command, { timeoutMs });
  if (result.error) {
    console.error(`✗ Command failed: ${result.error.message}`);
    return (result.error as NodeJS.ErrnoException).code === 'ENOENT' ? 127 : 1;
  }
  if (result.timedOut) {
    console.error(`✗ Command timed out after ${timeoutMs}ms`);
    return 1;
  }
  return result.code ?? 1;
};
