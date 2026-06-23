import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decideSiteSmoke } from './decide';
import { parseSiteProbe, SITE_SMOKE_HOST_SOURCE } from './host';
import { navBaseUrl, navServiceOf, serviceTimeout, siteServiceEnv } from './plan';
import type { SiteProbe, SiteService, SiteSmokeDeps, SiteSmokeResult, SiteSmokeSpec, StartedService } from './types';

/**
 * Boot the service(s), drive a headless browser over every route, tear everything down —
 * returning a structured pass/fail. NEVER throws: a build failure, a boot failure, an
 * absent browser, or a per-route error all come back as a {@link SiteSmokeResult}. The
 * `ran` vs `ok` split is load-bearing: a check that CANNOT run (no playwright, a server
 * that never booted) reports `ran:false` and must NOT block the gate; only a check that
 * ran and saw a broken route reports `ran:true, ok:false` → RED. Always removes the
 * throwaway home dirs.
 */
export async function runSiteSmoke(spec: SiteSmokeSpec, deps: SiteSmokeDeps = {}): Promise<SiteSmokeResult> {
  const startService = deps.startService ?? defaultStartService;
  const runProbe = deps.runProbe ?? defaultRunProbe;
  const runBuild = deps.runBuild ?? defaultRunBuild;
  const ensureDir = deps.ensureDir ?? ((dir: string) => mkdir(dir, { recursive: true }).then(() => undefined));
  const removeDir = deps.removeDir ?? ((dir: string) => rm(dir, { recursive: true, force: true }));
  const resolvePlaywright = deps.resolvePlaywright ?? defaultResolvePlaywright;
  const now = deps.now ?? (() => Date.now());

  const started = now();
  const elapsed = () => now() - started;
  const homeDirs = spec.services.map((s) => s.homeDir).filter((d): d is string => !!d);
  const cleanupHomes = () => Promise.all(homeDirs.map((d) => removeDir(d).catch(() => {})));

  // Resolve the browser FIRST (cheap) — no point booting heavy servers if we can't
  // drive a browser. An absent browser is INCONCLUSIVE, never a RED.
  const navSvc = navServiceOf(spec);
  const playwrightPath = resolvePlaywright(navSvc.cwd);
  if (!playwrightPath) {
    return {
      repo: spec.repo,
      ran: false,
      ok: false,
      detail: 'playwright not available — site smoke skipped (inconclusive)',
      durationMs: elapsed(),
    };
  }

  // Optional one-shot build (built-dist mode). A build FAILURE is definitive (RED); a
  // failure to even spawn the build is inconclusive (tooling, not a proven site failure).
  if (spec.buildCmd && spec.buildCmd.length > 0) {
    try {
      const b = await runBuild(spec.buildCmd, spec.cwd);
      if (b.code !== 0) {
        return {
          repo: spec.repo,
          ran: true,
          ok: false,
          detail: `UI build failed (${spec.buildCmd.join(' ')}) — the bundle does not compile`,
          logTail: tailLines(b.output.split('\n')),
          durationMs: elapsed(),
        };
      }
    } catch (e) {
      return {
        repo: spec.repo,
        ran: false,
        ok: false,
        detail: `could not run UI build: ${errMsg(e)}`,
        durationMs: elapsed(),
      };
    }
  }

  for (const d of homeDirs) {
    try {
      await ensureDir(d);
    } catch (e) {
      await cleanupHomes();
      return {
        repo: spec.repo,
        ran: false,
        ok: false,
        detail: `failed to create isolated home (${d}): ${errMsg(e)}`,
        durationMs: elapsed(),
      };
    }
  }

  const running: StartedService[] = [];
  const stopAll = async () => {
    for (const s of running.reverse()) {
      try {
        await s.stop();
      } catch {
        /* best-effort */
      }
    }
  };
  const logTail = () => tailLines(running.flatMap((s) => s.logs().map((l) => `[${s.name}] ${l}`)));

  // Boot services in order (companions first). A service that won't boot is a BOOT
  // failure (the boot smoke's job) — inconclusive here, not a false white screen.
  for (const svc of spec.services) {
    try {
      running.push(await startService(svc));
    } catch (e) {
      const tail = logTail();
      await stopAll();
      await cleanupHomes();
      return {
        repo: spec.repo,
        ran: false,
        ok: false,
        detail: `service "${svc.name}" did not boot for site smoke: ${errMsg(e)}`,
        logTail: tail,
        durationMs: elapsed(),
      };
    }
  }

  try {
    const probe = await runProbe(navBaseUrl(spec), spec, playwrightPath);
    const verdict = decideSiteSmoke(probe, spec);
    return {
      repo: spec.repo,
      ran: verdict.ran,
      ok: verdict.ok,
      detail: verdict.detail,
      logTail: logTail(),
      probe,
      verdict,
      durationMs: elapsed(),
    };
  } catch (e) {
    // A probe that throws is a tooling failure, not a proven broken site → inconclusive.
    return {
      repo: spec.repo,
      ran: false,
      ok: false,
      detail: `site probe errored: ${errMsg(e)}`,
      logTail: logTail(),
      durationMs: elapsed(),
    };
  } finally {
    await stopAll();
    await cleanupHomes();
  }
}

/** A throwaway, per-run isolated home dir for a service (under the OS tmpdir). */
export function siteSmokeHomeDir(repo: string, seed: string | number = process.pid): string {
  return join(tmpdir(), `site-smoke-${repo}-${seed}`);
}

/**
 * Ask the OS for a free ephemeral TCP port (bind :0, read the assigned port, close).
 * A tiny race exists between close and the server's bind, but for a local smoke that's
 * acceptable — far better than a hardcoded port that collides with a running app.
 */
export async function pickFreePort(): Promise<number> {
  const net = await import('node:net');
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => (port ? resolve(port) : reject(new Error('could not pick a free port'))));
    });
  });
}

/** Default: resolve the `playwright` entry path from `fromDir`, then this module, else null. */
export function defaultResolvePlaywright(fromDir: string): string | null {
  for (const base of [join(fromDir, 'noop.js'), import.meta.url]) {
    try {
      return createRequire(base).resolve('playwright');
    } catch {
      /* try the next base */
    }
  }
  return null;
}

/** Default service boot: spawn `cmd` in `cwd`, poll readiness, return a teardown handle. */
async function defaultStartService(svc: SiteService): Promise<StartedService> {
  const { spawn } = await import('node:child_process');
  const env = { ...process.env, ...siteServiceEnv(svc) };
  const child = spawn(svc.cmd[0], svc.cmd.slice(1), {
    cwd: svc.cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const logs: string[] = [];
  const push = (buf: Buffer) => {
    for (const l of buf.toString().split('\n')) if (l.trim()) logs.push(l);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
  };
  child.stdout?.on('data', push);
  child.stderr?.on('data', push);
  let exited = false;
  child.on('exit', () => {
    exited = true;
  });

  const handle: StartedService = {
    name: svc.name,
    logs: () => logs.slice(),
    stop: async () => {
      if (exited) return;
      try {
        if (child.pid) process.kill(-child.pid, 'SIGTERM');
        else child.kill('SIGTERM');
      } catch {
        try {
          child.kill('SIGTERM');
        } catch {
          /* gone */
        }
      }
      await sleep(400);
      if (!exited) {
        try {
          if (child.pid) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch {
          /* gone */
        }
      }
    },
  };

  const url = `http://127.0.0.1:${svc.port}${svc.readyPath ?? '/'}`;
  const deadline = Date.now() + serviceTimeout(svc);
  while (Date.now() < deadline) {
    if (exited) {
      await handle.stop();
      throw new Error(`service "${svc.name}" exited before becoming ready:\n${logs.slice(-20).join('\n')}`);
    }
    try {
      const res = await fetch(url);
      const ready = svc.isReady ? await svc.isReady(res) : res.status < 400;
      if (ready) return handle;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  await handle.stop();
  throw new Error(
    `service "${svc.name}" not ready within ${serviceTimeout(svc)}ms at ${url}:\n${logs.slice(-20).join('\n')}`,
  );
}

/** Default build runner: spawn `cmd` in `cwd`, capturing combined output + the exit code. */
async function defaultRunBuild(cmd: string[], cwd: string): Promise<{ code: number; output: string }> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout?.on('data', (b: Buffer) => {
      output += b.toString();
    });
    child.stderr?.on('data', (b: Buffer) => {
      output += b.toString();
    });
    child.on('error', (e) => resolve({ code: 1, output: `${output}\n${errMsg(e)}` }));
    child.on('exit', (code) => resolve({ code: code ?? 1, output }));
  });
}

/**
 * Default probe: write the embedded host to a temp `.mjs`, write the route config to a
 * temp `.json`, spawn the Node Playwright host (`node host.mjs --config cfg.json`), and
 * parse its single result line. Never throws: a spawn error becomes an inconclusive probe.
 */
async function defaultRunProbe(baseUrl: string, spec: SiteSmokeSpec, playwrightPath: string): Promise<SiteProbe> {
  const { spawn } = await import('node:child_process');
  const seed = `${process.pid}-${spec.services[0]?.port ?? 0}`;
  const hostPath = join(tmpdir(), `site-smoke-host-${seed}.mjs`);
  const cfgPath = join(tmpdir(), `site-smoke-cfg-${seed}.json`);
  try {
    await writeFile(hostPath, SITE_SMOKE_HOST_SOURCE, 'utf8');
    await writeFile(
      cfgPath,
      JSON.stringify({
        baseUrl,
        rootSelector: spec.rootSelector,
        navTimeoutMs: spec.navTimeoutMs,
        playwrightPath,
        routes: spec.routes.map((r) => ({
          path: r.path,
          label: r.label,
          landmark: r.landmark,
          landmarkOptional: r.landmarkOptional,
        })),
      }),
      'utf8',
    );
  } catch (e) {
    return { launched: false, routes: [], error: `could not stage site smoke host: ${errMsg(e)}` };
  }
  try {
    const probe = await new Promise<SiteProbe>((resolve) => {
      const child = spawn('node', [hostPath, '--config', cfgPath], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      let err = '';
      child.stdout?.on('data', (b: Buffer) => {
        out += b.toString();
      });
      child.stderr?.on('data', (b: Buffer) => {
        err += b.toString();
      });
      child.on('error', (e) =>
        resolve({ launched: false, routes: [], error: `could not spawn node host: ${errMsg(e)}` }),
      );
      child.on('exit', () => resolve(parseSiteProbe(out, err)));
    });
    return probe;
  } finally {
    await rm(hostPath, { force: true }).catch(() => {});
    await rm(cfgPath, { force: true }).catch(() => {});
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function tailLines(lines: string[], n = 30): string {
  return lines
    .filter((l) => l.trim())
    .slice(-n)
    .join('\n');
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
