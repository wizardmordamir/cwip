import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Throwaway directories created this process, removed on exit. Kept best-effort:
// temp dirs are ephemeral anyway, so a missed cleanup never corrupts real state.
const created: string[] = [];
let cleanupRegistered = false;

const registerCleanup = () => {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.on('exit', () => {
    for (const dir of created.splice(0)) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort — the OS reclaims /tmp regardless
      }
    }
  });
};

/** Create a throwaway temp directory that is removed when the process exits. */
export const makeTempDir = (prefix = 'cwip-test-'): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  registerCleanup();
  return dir;
};

/** Remove a temp dir now (best effort). Safe to call on an already-gone path. */
export const removeTempDir = (dir: string): void => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
};

/**
 * Point an env var at a fresh temp directory so a test run never touches real
 * on-disk state (databases, uploads, caches). Idempotent: if `envVar` is already
 * set it's respected untouched — that lets an outer harness (or a spawned child
 * inheriting the parent's choice) stay in control. Returns the directory in use.
 *
 * The canonical use is a bunfig `preload` that runs before any app module loads:
 *   isolateEnvDir('CA_DATA_DIR');  // every later `process.cwd()`-relative path
 *                                   // now resolves under a throwaway dir
 */
export const isolateEnvDir = (envVar: string, prefix = `cwip-${envVar.toLowerCase()}-`): string => {
  const existing = process.env[envVar];
  if (existing) return existing;
  const dir = makeTempDir(prefix);
  process.env[envVar] = dir;
  return dir;
};
