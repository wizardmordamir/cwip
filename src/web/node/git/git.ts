import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run `git -C <repo> <args>` and return its exit code + output, never throwing on
 * a non-zero exit (so callers branch on `code` instead of try/catch). Uses
 * `node:child_process` (no shell, args passed as an array — injection-safe) so it
 * stays within `cwip/node`'s "node built-ins only, no bun:*" rule.
 *
 *   const { code, stdout } = await git('/repo', ['rev-parse', 'HEAD']);
 */
export const git = async (repo: string, args: string[]): Promise<GitResult> => {
  try {
    const { stdout, stderr } = await execFileAsync('git', ['-C', repo, ...args], { maxBuffer: 1024 * 1024 * 16 });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      code: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? '',
    };
  }
};
