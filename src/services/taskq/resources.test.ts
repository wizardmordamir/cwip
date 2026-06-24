import { describe, expect, test } from 'bun:test';
import {
  type ResourceReaders,
  resourcePressure,
  resourceThrottle,
  sampleSystemResources,
  stepDownModel,
  stepDownThink,
  type SystemResourceSample,
} from './resources';

/** A fully-injected reader set so the sampler is deterministic (no real machine state). */
function readers(over: Partial<{ load1: number; cores: number; total: number; free: number; gpu: number | null }> = {}): ResourceReaders {
  const { load1 = 0, cores = 8, total = 16_000, free = 8_000, gpu = null } = over;
  return {
    loadavg: () => [load1, load1, load1],
    cpuCount: () => cores,
    totalmem: () => total,
    freemem: () => free,
    gpu: () => gpu,
    now: () => '2026-06-24T00:00:00.000Z',
  };
}

describe('sampleSystemResources', () => {
  test('CPU = loadavg / cores, clamped to 1', () => {
    expect(sampleSystemResources(readers({ load1: 4, cores: 8 })).cpu).toBe(0.5);
    expect(sampleSystemResources(readers({ load1: 32, cores: 8 })).cpu).toBe(1); // overloaded → clamped
  });

  test('memory = (total − free) / total', () => {
    expect(sampleSystemResources(readers({ total: 16_000, free: 4_000 })).mem).toBe(0.75);
  });

  test('GPU passes through the injected probe (null when unmeasured)', () => {
    expect(sampleSystemResources(readers({ gpu: 0.42 })).gpu).toBe(0.42);
    expect(sampleSystemResources(readers({ gpu: null })).gpu).toBeNull();
  });

  test('cores floored to 1 to avoid divide-by-zero', () => {
    expect(sampleSystemResources(readers({ load1: 2, cores: 0 })).cpu).toBe(1);
  });
});

describe('resourcePressure', () => {
  const base: SystemResourceSample = { cpu: 0.3, mem: 0.4, gpu: null, cores: 8, sampledAt: 'x' };

  test('the worst (most-constrained) resource binds', () => {
    expect(resourcePressure({ ...base, cpu: 0.3, mem: 0.8 })).toBe(0.8);
    expect(resourcePressure({ ...base, cpu: 0.9, mem: 0.2 })).toBe(0.9);
  });

  test('a measured GPU joins the max; a null GPU is ignored', () => {
    expect(resourcePressure({ ...base, cpu: 0.2, mem: 0.2, gpu: 0.95 })).toBe(0.95);
    expect(resourcePressure({ ...base, cpu: 0.2, mem: 0.2, gpu: null })).toBe(0.2);
  });
});

describe('resourceThrottle', () => {
  const cfg = { maxJobs: 4 };

  test('machine free → full pool, no light preference', () => {
    const d = resourceThrottle(0.2, cfg);
    expect(d.jobsCap).toBe(4);
    expect(d.preferLight).toBe(false);
  });

  test('machine saturated → 1 worker + light models', () => {
    const d = resourceThrottle(0.95, cfg);
    expect(d.jobsCap).toBe(1);
    expect(d.preferLight).toBe(true);
  });

  test('ramps down monotonically between low and high pressure', () => {
    let prev = 99;
    for (let p = 0.6; p <= 0.9; p += 0.05) {
      const cap = resourceThrottle(p, cfg).jobsCap;
      expect(cap).toBeLessThanOrEqual(prev);
      expect(cap).toBeGreaterThanOrEqual(1); // never throttles to 0 — busy slows, never halts
      prev = cap;
    }
  });

  test('preferLight engages before the pool is fully floored', () => {
    expect(resourceThrottle(0.78, cfg).preferLight).toBe(true); // past default 0.75
    expect(resourceThrottle(0.7, cfg).preferLight).toBe(false);
  });

  test('disabled (owner bypass) → full pool, never light, regardless of pressure', () => {
    const d = resourceThrottle(0.99, { maxJobs: 4, enabled: false });
    expect(d.jobsCap).toBe(4);
    expect(d.preferLight).toBe(false);
    expect(d.reason).toMatch(/off/);
  });

  test('a 1-worker ceiling stays 1 but still flags light under strain', () => {
    expect(resourceThrottle(0.95, { maxJobs: 1 }).jobsCap).toBe(1);
    expect(resourceThrottle(0.95, { maxJobs: 1 }).preferLight).toBe(true);
  });
});

describe('model / think step-down ladder', () => {
  test('one notch weaker on the reasoning ladder', () => {
    expect(stepDownModel('opus-1m')).toBe('opus');
    expect(stepDownModel('opus')).toBe('sonnet');
    expect(stepDownModel('sonnet')).toBe('haiku');
  });

  test('floored / creative models are left untouched', () => {
    expect(stepDownModel('haiku')).toBe('haiku');
    expect(stepDownModel('fable')).toBe('fable');
  });

  test('think budget steps down one level, floored at low/off', () => {
    expect(stepDownThink('max')).toBe('high');
    expect(stepDownThink('high')).toBe('medium');
    expect(stepDownThink('medium')).toBe('low');
    expect(stepDownThink('low')).toBe('low');
    expect(stepDownThink('off')).toBe('off');
  });
});
