import { describe, expect, test } from 'bun:test';
import { type CcusageReport, costByModel, parseCcusageJson, recentDaily } from './ccusage';

// Trimmed but shape-faithful sample of `ccusage daily --json` output.
const SAMPLE = JSON.stringify({
  daily: [
    {
      agent: 'all',
      period: '2026-06-16',
      inputTokens: 928389,
      outputTokens: 7761053,
      cacheCreationTokens: 23031515,
      cacheReadTokens: 1210448966,
      totalTokens: 1242169923,
      totalCost: 903.2131359999989,
      modelsUsed: ['claude-haiku-4-5-20251001', 'claude-opus-4-8', 'claude-sonnet-4-6'],
      modelBreakdowns: [
        {
          modelName: 'claude-opus-4-8',
          inputTokens: 901066,
          outputTokens: 6038311,
          cacheCreationTokens: 15770655,
          cacheReadTokens: 867009405,
          cost: 736.6716300000007,
        },
        {
          modelName: 'claude-sonnet-4-6',
          inputTokens: 26683,
          outputTokens: 1703606,
          cacheCreationTokens: 6954689,
          cacheReadTokens: 340920582,
          cost: 165.81057435000017,
        },
      ],
    },
    {
      agent: 'all',
      period: '2026-06-17',
      inputTokens: 766489,
      outputTokens: 4660553,
      cacheCreationTokens: 16666807,
      cacheReadTokens: 1023314561,
      totalTokens: 1045408410,
      totalCost: 652.1403666499995,
      modelsUsed: ['claude-opus-4-8'],
      modelBreakdowns: [
        {
          modelName: 'claude-opus-4-8',
          inputTokens: 704036,
          outputTokens: 2958362,
          cacheCreationTokens: 7705563,
          cacheReadTokens: 635363738,
          cost: 472.2167289999999,
        },
      ],
    },
  ],
  totals: {
    cacheCreationTokens: 39698322,
    cacheReadTokens: 2233763527,
    inputTokens: 1694878,
    outputTokens: 12421606,
    totalCost: 1555.35,
    totalTokens: 2287578333,
  },
});

describe('parseCcusageJson', () => {
  const r = parseCcusageJson(SAMPLE) as CcusageReport;

  test('parses daily entries and totals', () => {
    expect(r).not.toBeNull();
    expect(r.daily).toHaveLength(2);
    expect(r.daily[0].period).toBe('2026-06-16');
    expect(r.daily[0].modelBreakdowns).toHaveLength(2);
    expect(r.totals.totalCost).toBeCloseTo(1555.35, 2);
    expect(r.totals.totalTokens).toBe(2287578333);
  });

  test('returns null on invalid JSON or wrong shape', () => {
    expect(parseCcusageJson('not json')).toBeNull();
    expect(parseCcusageJson('{}')).toBeNull();
    expect(parseCcusageJson('{"daily":"nope"}')).toBeNull();
  });

  test('coerces missing numeric fields to 0', () => {
    const sparse = parseCcusageJson('{"daily":[{"period":"x"}],"totals":{}}') as CcusageReport;
    expect(sparse.daily[0].totalCost).toBe(0);
    expect(sparse.daily[0].modelBreakdowns).toEqual([]);
    expect(sparse.totals.totalCost).toBe(0);
  });
});

describe('costByModel', () => {
  test('aggregates per-model cost across days, sorted by cost desc', () => {
    const r = parseCcusageJson(SAMPLE) as CcusageReport;
    const byModel = costByModel(r);
    expect(byModel[0].modelName).toBe('claude-opus-4-8');
    expect(byModel[0].cost).toBeCloseTo(736.6716 + 472.2167, 2);
    expect(byModel.find((m) => m.modelName === 'claude-sonnet-4-6')?.cost).toBeCloseTo(165.8106, 3);
  });
});

describe('recentDaily', () => {
  test('returns the last n days in order', () => {
    const r = parseCcusageJson(SAMPLE) as CcusageReport;
    expect(recentDaily(r, 1).map((d) => d.period)).toEqual(['2026-06-17']);
    expect(recentDaily(r, 5)).toHaveLength(2);
  });
});
