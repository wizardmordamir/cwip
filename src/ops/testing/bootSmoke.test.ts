import { describe, expect, test } from 'bun:test';
import {
  pickFreePort,
  planSmoke,
  runBootSmoke,
  type SmokeDeps,
  type SmokeSpec,
  smokeEnv,
  smokeHomeDir,
} from './bootSmoke';

describe('planSmoke', () => {
  test('fills defaults (healthPath, timeoutMs) and keeps explicit fields', () => {
    const spec = planSmoke({
      repo: 'x',
      cmd: ['bun', 'run', 'serve'],
      cwd: '/tmp/x-integration',
      homeEnvVar: 'X_HOME',
      portEnvVar: 'X_PORT',
      port: 5555,
      homeDir: '/tmp/x-home',
    });
    expect(spec.healthPath).toBe('/api/health');
    expect(spec.timeoutMs).toBe(30_000);
    expect(spec.port).toBe(5555);
    expect(spec.cwd).toBe('/tmp/x-integration');
  });

  test('respects an explicit healthPath + timeoutMs', () => {
    const spec = planSmoke({
      repo: 'x',
      cmd: ['bun', 'run', 'serve'],
      cwd: '/tmp',
      homeEnvVar: 'X_HOME',
      portEnvVar: 'X_PORT',
      port: 1,
      homeDir: '/tmp/h',
      healthPath: '/healthz',
      timeoutMs: 5_000,
    });
    expect(spec.healthPath).toBe('/healthz');
    expect(spec.timeoutMs).toBe(5_000);
  });
});

describe('smokeEnv', () => {
  test('isolates the home + binds the port, merging extras', () => {
    const spec = planSmoke({
      repo: 'x',
      cmd: ['bun'],
      cwd: '/tmp',
      homeEnvVar: 'APP_HOME',
      portEnvVar: 'APP_PORT',
      port: 4848,
      homeDir: '/tmp/throwaway',
      extraEnv: { NODE_ENV: 'test' },
    });
    expect(smokeEnv(spec)).toEqual({ APP_HOME: '/tmp/throwaway', APP_PORT: '4848', NODE_ENV: 'test' });
  });

  test('no extraEnv — only the two isolation knobs', () => {
    const spec = planSmoke({
      repo: 'y',
      cmd: ['bun'],
      cwd: '/tmp',
      homeEnvVar: 'Y_HOME',
      portEnvVar: 'Y_PORT',
      port: 9000,
      homeDir: '/tmp/y-home',
    });
    expect(smokeEnv(spec)).toEqual({ Y_HOME: '/tmp/y-home', Y_PORT: '9000' });
  });
});

function fakeStart(opts: { healthy: boolean; logs?: string[] }) {
  const calls = { started: 0, stopped: 0, lastOpts: undefined as unknown };
  const start: NonNullable<SmokeDeps['startServer']> = async (o) => {
    calls.started++;
    calls.lastOpts = o;
    if (!opts.healthy) throw new Error('server never became healthy\n<<logs>>');
    return {
      logs: () => opts.logs ?? ['listening on 127.0.0.1'],
      stop: async () => {
        calls.stopped++;
      },
    };
  };
  return { start, calls };
}

const baseSpec = (): SmokeSpec =>
  planSmoke({
    repo: 'ru',
    cmd: ['bun', 'run', 'src/scripts/serve.ts'],
    cwd: '/repo/rubato-integration',
    homeEnvVar: 'RUBATO_HOME',
    portEnvVar: 'RUBATO_PORT',
    port: 4848,
    homeDir: '/tmp/ru-smoke-home',
  });

describe('runBootSmoke (injected)', () => {
  test('healthy boot → ok, cleans up the server + home, reports duration', async () => {
    const created: string[] = [];
    const removed: string[] = [];
    const { start, calls } = fakeStart({ healthy: true, logs: ['boot', 'ready'] });
    let t = 1000;
    const res = await runBootSmoke(baseSpec(), {
      startServer: start,
      ensureDir: async (d) => {
        created.push(d);
      },
      removeDir: async (d) => {
        removed.push(d);
      },
      now: () => (t += 50),
    });
    expect(res.ok).toBe(true);
    expect(res.repo).toBe('ru');
    expect(res.detail).toContain('/api/health');
    expect(res.logTail).toContain('ready');
    expect(res.durationMs).toBeGreaterThan(0);
    expect(created).toEqual(['/tmp/ru-smoke-home']);
    expect(removed).toEqual(['/tmp/ru-smoke-home']);
    expect(calls.started).toBe(1);
    expect(calls.stopped).toBe(1);
    expect((calls.lastOpts as { env: Record<string, string> }).env.RUBATO_HOME).toBe('/tmp/ru-smoke-home');
  });

  test('never-healthy boot → ok:false with the failure surfaced, home still removed', async () => {
    const removed: string[] = [];
    const { start, calls } = fakeStart({ healthy: false });
    const res = await runBootSmoke(baseSpec(), {
      startServer: start,
      ensureDir: async () => {},
      removeDir: async (d) => {
        removed.push(d);
      },
    });
    expect(res.ok).toBe(false);
    expect(res.detail).toContain('boot smoke failed');
    expect(res.detail).toContain('never became healthy');
    expect(removed).toEqual(['/tmp/ru-smoke-home']);
    expect(calls.stopped).toBe(0);
  });

  test("can't create the isolated home → ok:false, server never started", async () => {
    const { start, calls } = fakeStart({ healthy: true });
    const res = await runBootSmoke(baseSpec(), {
      startServer: start,
      ensureDir: async () => {
        throw new Error('EACCES');
      },
      removeDir: async () => {},
    });
    expect(res.ok).toBe(false);
    expect(res.detail).toContain('failed to create isolated home');
    expect(calls.started).toBe(0);
  });
});

describe('smokeHomeDir / pickFreePort', () => {
  test('smokeHomeDir is repo+seed scoped under tmp', () => {
    const dir = smokeHomeDir('ca', 99);
    expect(dir).toContain('intgate-smoke-ca-99');
  });

  test('pickFreePort returns a usable ephemeral port', async () => {
    const port = await pickFreePort();
    expect(port).toBeGreaterThan(1024);
    expect(port).toBeLessThan(65536);
  });
});
