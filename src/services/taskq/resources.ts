/**
 * Local-machine resource sampling + a pure resource-pressure throttle policy.
 *
 * Where {@link ./schedule scheduleDecision} throttles on the PROVIDER token budget
 * (the shared rate-limit), this throttles on the LOCAL machine — CPU, memory, and
 * (best-effort) GPU. An orchestrator/drainer that runs real workers on a real box
 * should be a good local citizen: when the machine is strained run fewer workers and
 * steer to lighter models; when it is free run at full strength. This matters most
 * where local model inference (Ollama / diffusion) and many concurrent worktree
 * builds compete for the same CPU/RAM/GPU.
 *
 * Only {@link sampleSystemResources} does I/O (`node:os`, with injectable readers so
 * the policy is unit-testable with no real machine state). The pressure blend
 * ({@link resourcePressure}) and the throttle curve ({@link resourceThrottle}) are
 * PURE + deterministic — the same shape as schedule.ts, so both halves compose: a
 * consumer takes the tighter of the token cap and the resource cap, and ORs the two
 * `preferLight` signals. Nothing here ever pins or overrides a task's model; it only
 * RECOMMENDS, exactly like the token scheduler.
 */

import os from 'node:os';
import { type ModelAlias, type ThinkLevel } from './types';

/** One reading of the local machine's resource utilisation (each field 0–1). */
export interface SystemResourceSample {
  /** CPU utilisation 0–1 — 1-minute loadavg per core, clamped (Unix); 0 when unknowable. */
  cpu: number;
  /** Memory in-use fraction 0–1 = (total − free) / total. */
  mem: number;
  /** GPU utilisation 0–1, or `null` when unmeasurable on this host (the common case). */
  gpu: number | null;
  /** Logical CPU core count (the loadavg normaliser). */
  cores: number;
  /** ISO-8601 timestamp of the reading. */
  sampledAt: string;
}

/**
 * Injectable seams for {@link sampleSystemResources} so the sampler is deterministic
 * in tests (and so a consumer can plug a real GPU probe). Each defaults to the real
 * `node:os` reading; `gpu` defaults to "unmeasured" (`null`) because there is no
 * cheap, unprivileged, cross-platform GPU-utilisation read — a consumer that needs
 * it (e.g. a box running local diffusion) injects an `nvidia-smi`/`ioreg` probe.
 */
export interface ResourceReaders {
  /** Returns `[1m, 5m, 15m]` load averages (Unix); `[0,0,0]` on platforms without it. */
  loadavg?: () => number[];
  totalmem?: () => number;
  freemem?: () => number;
  cpuCount?: () => number;
  /** Best-effort GPU utilisation 0–1, or `null` when unknown. Default: always `null`. */
  gpu?: () => number | null;
  now?: () => string;
}

/**
 * Read the machine's current CPU / memory / GPU utilisation. CPU is the 1-minute
 * load average divided by the core count (the cheap, synchronous, allocation-free
 * proxy — a busy box reads > 1 and is clamped to 1). Memory is the in-use fraction.
 * GPU is whatever the injected probe reports (default `null` = unmeasured, which the
 * pressure blend then ignores). Synchronous so a hot scheduling loop can call it
 * every slot-fill with no async cost; the only "live" cost is reading `node:os`.
 */
export function sampleSystemResources(readers: ResourceReaders = {}): SystemResourceSample {
  const cores = Math.max(1, readers.cpuCount?.() ?? os.cpus().length);
  const load1 = (readers.loadavg?.() ?? os.loadavg())[0] ?? 0;
  const total = readers.totalmem?.() ?? os.totalmem();
  const free = readers.freemem?.() ?? os.freemem();
  const gpuRaw = readers.gpu ? readers.gpu() : null;
  return {
    cpu: clamp01(load1 / cores),
    mem: total > 0 ? clamp01((total - free) / total) : 0,
    gpu: gpuRaw == null ? null : clamp01(gpuRaw),
    cores,
    sampledAt: readers.now?.() ?? new Date().toISOString(),
  };
}

/**
 * Blend a sample into a single 0–1 pressure: the WORST (most-constrained) resource
 * binds — the same conservative "worst bucket wins" rule the token scheduler uses,
 * since one saturated resource thrashes the box regardless of the others' slack. A
 * `null` GPU is simply absent from the max (an unmeasured resource never invents
 * pressure). Pure.
 */
export function resourcePressure(sample: SystemResourceSample): number {
  const parts = [sample.cpu, sample.mem];
  if (sample.gpu != null) parts.push(sample.gpu);
  return clamp01(Math.max(...parts));
}

/** Config for {@link resourceThrottle} — mirrors {@link ./schedule.ScheduleConfig}'s shape. */
export interface ResourceThrottleConfig {
  /** Worker ceiling when the machine is free. */
  maxJobs: number;
  /** At/below {@link lowPressure} the pool runs at full {@link maxJobs}; default 0.6. */
  lowPressure?: number;
  /** At/above {@link highPressure} the pool is floored to 1 worker + light models; default 0.9. */
  highPressure?: number;
  /** At/above this pressure, recommend light models (skip heavy tiers); default 0.75. */
  preferLightPressure?: number;
  /**
   * When `false`, the throttle is BYPASSED — full {@link maxJobs}, never `preferLight`.
   * This is the owner's "let me override the intelligent local choices" switch. Default `true`.
   */
  enabled?: boolean;
}

/** The local-resource scheduling recommendation (advisory, like {@link ./schedule.ScheduleDecision}). */
export interface ResourceThrottleDecision {
  /** Worker ceiling the local machine currently allows (never below 1 — the box being busy slows, never halts). */
  jobsCap: number;
  /** Steer to cheaper/lighter models (skip heavy tiers) while the machine is strained. */
  preferLight: boolean;
  /** The blended pressure this decision was made from (0–1). */
  pressure: number;
  reason: string;
}

/**
 * Map a local-resource pressure (0–1) to a worker ceiling + a light-model preference,
 * on a pure curve that mirrors the token scheduler:
 *  - `enabled: false`        → no throttle (full `maxJobs`, never `preferLight`) — the owner's bypass.
 *  - pressure ≤ `lowPressure`  → full `maxJobs` (machine is free).
 *  - pressure ≥ `highPressure` → exactly 1 worker + `preferLight` (machine is saturated).
 *  - in between               → linear ramp `maxJobs → 1`; `preferLight` once past `preferLightPressure`.
 * The floor is 1, never 0: a busy machine should SLOW work, not stop it (unlike a fully
 * spent token budget, which legitimately pauses). Deterministic + side-effect-free.
 */
export function resourceThrottle(
  pressure: number,
  config: ResourceThrottleConfig,
): ResourceThrottleDecision {
  const maxJobs = Math.max(1, Math.floor(config.maxJobs));
  const p = clamp01(pressure);
  if (config.enabled === false) {
    return { jobsCap: maxJobs, preferLight: false, pressure: p, reason: 'resource-aware mode off' };
  }
  const low = config.lowPressure ?? 0.6;
  const high = config.highPressure ?? 0.9;
  const lightAt = config.preferLightPressure ?? 0.75;
  const preferLight = p >= lightAt;

  if (p <= low || maxJobs <= 1) {
    return {
      jobsCap: maxJobs,
      preferLight,
      pressure: p,
      reason: p <= low ? 'machine free — full pool' : 'single-worker pool',
    };
  }
  if (p >= high) {
    return { jobsCap: 1, preferLight: true, pressure: p, reason: 'machine saturated — 1 worker + light models' };
  }
  // Linear ramp: full workers at `low` → 1 worker at `high`.
  const frac = (high - p) / (high - low);
  const jobsCap = Math.max(1, Math.round(1 + frac * (maxJobs - 1)));
  return {
    jobsCap,
    preferLight,
    pressure: p,
    reason: `machine strained (${Math.round(p * 100)}%) — pool ${jobsCap}/${maxJobs}${preferLight ? ' + light models' : ''}`,
  };
}

/**
 * The model-strength ladder, strongest → weakest: a single "step down" under local
 * strain. The creative model (`fable`) and an already-floored `haiku` are left
 * untouched. Shared so the orchestrator and the drainer downgrade identically.
 */
const MODEL_STEP_DOWN: Partial<Record<ModelAlias, ModelAlias>> = {
  'opus-1m': 'opus',
  opus: 'sonnet',
  sonnet: 'haiku',
};

const THINK_STEP_DOWN: Partial<Record<ThinkLevel, ThinkLevel>> = {
  max: 'high',
  high: 'medium',
  medium: 'low',
  low: 'low',
  off: 'off',
};

/** One notch weaker on the reasoning ladder (`opus → sonnet → haiku`); unknown/floored aliases unchanged. Pure. */
export function stepDownModel(model: ModelAlias): ModelAlias {
  return MODEL_STEP_DOWN[model] ?? model;
}

/** One notch lower thinking budget (`max → high → medium → low`); floored aliases unchanged. Pure. */
export function stepDownThink(think: ThinkLevel): ThinkLevel {
  return THINK_STEP_DOWN[think] ?? think;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
