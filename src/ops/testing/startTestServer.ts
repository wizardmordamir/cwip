import type { Subprocess } from 'bun';

export interface StartTestServerOptions {
  /** Command + args to spawn, e.g. `['bun', 'src/index.ts']`. */
  cmd: string[];
  /** Port the server listens on — used to build `baseUrl` + the health URL. */
  port: number;
  /** Working directory for the spawned process. */
  cwd?: string;
  /** Extra env merged over `process.env` (undefined values delete the key). */
  env?: Record<string, string | undefined>;
  /** Health endpoint: a path (joined to baseUrl) or an absolute URL. Default `/api/health`. */
  healthPath?: string;
  /** Treat a health Response as ready. Default: `res.ok` (2xx). */
  isHealthy?: (res: Response) => boolean | Promise<boolean>;
  /** Max ms to wait for the server to become healthy. Default 30000. */
  timeoutMs?: number;
  /** Poll interval ms while waiting for health. Default 200. */
  intervalMs?: number;
  /** Host used to build `baseUrl`. Default `127.0.0.1`. */
  host?: string;
  /** Recent stdout+stderr lines to retain for failure reporting. Default 300. */
  logBufferLines?: number;
  /** Mirror the child's stdout/stderr to the parent as it arrives. Default false. */
  echo?: boolean;
}

export interface TestServer {
  baseUrl: string;
  port: number;
  proc: Subprocess;
  /** `fetch` against the server's baseUrl (path is appended to baseUrl). */
  request(path: string, init?: RequestInit): Promise<Response>;
  /** Captured recent stdout+stderr lines, oldest first. Invaluable on failure. */
  logs(): string[];
  /** Kill the child and wait for it to exit. Safe to call more than once. */
  stop(): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Boot a real server in a subprocess for functional/e2e tests, then block until
 * it answers a health check. Captures the child's output into a ring buffer so a
 * startup failure throws with the actual server logs attached — no more opaque
 * "server never became healthy" with no clue why.
 *
 * Generic on purpose: pass any `cmd`, `port`, and `healthPath`. The caller is
 * responsible for pointing the child at an isolated data dir (e.g. via `env`).
 */
export const startTestServer = async (opts: StartTestServerOptions): Promise<TestServer> => {
  const {
    cmd,
    port,
    cwd,
    env,
    healthPath = '/api/health',
    isHealthy = (res) => res.ok,
    timeoutMs = 30_000,
    intervalMs = 200,
    host = '127.0.0.1',
    logBufferLines = 300,
    echo = false,
  } = opts;

  const baseUrl = `http://${host}:${port}`;
  const healthUrl = healthPath.startsWith('http') ? healthPath : `${baseUrl}${healthPath}`;

  // Merge env, dropping keys whose value is explicitly undefined.
  const mergedEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) mergedEnv[k] = v;
  if (env) {
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete mergedEnv[k];
      else mergedEnv[k] = v;
    }
  }

  const proc = Bun.spawn(cmd, { cwd, env: mergedEnv, stdout: 'pipe', stderr: 'pipe' });

  // Ring buffer of recent log lines, fed by background pumps over both streams.
  const lines: string[] = [];
  const push = (chunk: string, label: string) => {
    for (const line of chunk.split('\n')) {
      if (!line) continue;
      lines.push(`[${label}] ${line}`);
      if (lines.length > logBufferLines) lines.shift();
      if (echo) process.stdout.write(`${line}\n`);
    }
  };
  const pump = async (stream: ReadableStream<Uint8Array> | undefined, label: string) => {
    if (!stream) return;
    const decoder = new TextDecoder();
    try {
      for await (const bytes of stream as any) push(decoder.decode(bytes, { stream: true }), label);
    } catch {
      // stream torn down on stop() — ignore
    }
  };
  pump(proc.stdout as ReadableStream<Uint8Array>, 'out');
  pump(proc.stderr as ReadableStream<Uint8Array>, 'err');

  const logs = () => [...lines];

  const stop = async () => {
    try {
      proc.kill();
    } catch {
      // already gone
    }
    try {
      await proc.exited;
    } catch {
      // ignore
    }
  };

  // Poll for health, but fail fast if the child dies during startup.
  const deadline = Date.now() + timeoutMs;
  let lastErr = '';
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      await stop();
      throw new Error(
        `test server exited (code ${proc.exitCode}) before becoming healthy at ${healthUrl}\n` +
          `--- server logs ---\n${logs().join('\n') || '(no output)'}`,
      );
    }
    try {
      const res = await fetch(healthUrl);
      if (await isHealthy(res)) {
        return { baseUrl, port, proc, request: (path, init) => fetch(`${baseUrl}${path}`, init), logs, stop };
      }
      lastErr = `health responded ${res.status}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await sleep(intervalMs);
  }

  await stop();
  throw new Error(
    `test server never became healthy at ${healthUrl} within ${timeoutMs}ms (last: ${lastErr})\n` +
      `--- server logs ---\n${logs().join('\n') || '(no output)'}`,
  );
};
