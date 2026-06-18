/**
 * Parser + derivations for `ccusage daily --json` — the per-day token + cost
 * breakdown ccusage computes from local `~/.claude` transcripts. Pure: the
 * caller spawns ccusage and feeds the captured stdout here. Tolerant — returns
 * null on unparseable input so a poller can fall back to its last snapshot.
 */

/** Per-model token + cost slice within a day. */
export interface CcusageModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

/** One day's aggregated usage. */
export interface CcusageDailyEntry {
  period: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: CcusageModelBreakdown[];
}

/** Grand totals across all days reported. */
export interface CcusageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
}

/** The full `ccusage daily --json` report. */
export interface CcusageReport {
  daily: CcusageDailyEntry[];
  totals: CcusageTotals;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Parse `ccusage daily --json` stdout into a {@link CcusageReport}. Returns null
 * if the payload isn't the expected `{ daily: [...], totals: {...} }` shape.
 */
export function parseCcusageJson(stdout: string): CcusageReport | null {
  let raw: unknown;
  try {
    raw = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.daily)) return null;

  const daily: CcusageDailyEntry[] = obj.daily.map((d) => {
    const e = (d ?? {}) as Record<string, unknown>;
    const breakdowns = Array.isArray(e.modelBreakdowns) ? (e.modelBreakdowns as Record<string, unknown>[]) : [];
    return {
      period: typeof e.period === 'string' ? e.period : '',
      inputTokens: num(e.inputTokens),
      outputTokens: num(e.outputTokens),
      cacheCreationTokens: num(e.cacheCreationTokens),
      cacheReadTokens: num(e.cacheReadTokens),
      totalTokens: num(e.totalTokens),
      totalCost: num(e.totalCost),
      modelsUsed: Array.isArray(e.modelsUsed) ? (e.modelsUsed.filter((m) => typeof m === 'string') as string[]) : [],
      modelBreakdowns: breakdowns.map((b) => ({
        modelName: typeof b.modelName === 'string' ? b.modelName : 'unknown',
        inputTokens: num(b.inputTokens),
        outputTokens: num(b.outputTokens),
        cacheCreationTokens: num(b.cacheCreationTokens),
        cacheReadTokens: num(b.cacheReadTokens),
        cost: num(b.cost),
      })),
    };
  });

  const t = (obj.totals ?? {}) as Record<string, unknown>;
  const totals: CcusageTotals = {
    inputTokens: num(t.inputTokens),
    outputTokens: num(t.outputTokens),
    cacheCreationTokens: num(t.cacheCreationTokens),
    cacheReadTokens: num(t.cacheReadTokens),
    totalTokens: num(t.totalTokens),
    totalCost: num(t.totalCost),
  };

  return { daily, totals };
}

/** Per-model cost + token totals summed across every day in the report. */
export interface ModelCostTotal {
  modelName: string;
  cost: number;
  totalTokens: number;
  outputTokens: number;
}

/** Aggregate per-model cost/tokens across all days, sorted by cost descending. */
export function costByModel(report: CcusageReport): ModelCostTotal[] {
  const byModel = new Map<string, ModelCostTotal>();
  for (const day of report.daily) {
    for (const b of day.modelBreakdowns) {
      const cur = byModel.get(b.modelName) ?? {
        modelName: b.modelName,
        cost: 0,
        totalTokens: 0,
        outputTokens: 0,
      };
      cur.cost += b.cost;
      cur.totalTokens += b.inputTokens + b.outputTokens + b.cacheCreationTokens + b.cacheReadTokens;
      cur.outputTokens += b.outputTokens;
      byModel.set(b.modelName, cur);
    }
  }
  return [...byModel.values()].sort((a, b) => b.cost - a.cost);
}

/** The last `n` daily entries (most recent window), preserving chronological order. */
export function recentDaily(report: CcusageReport, n: number): CcusageDailyEntry[] {
  return report.daily.slice(-Math.max(0, n));
}
