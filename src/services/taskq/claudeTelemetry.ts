/**
 * Parser for the live Claude Code subscription telemetry surfaced by
 * `claude -p "/usage"` — the dependable, subscription-API-free reading of the
 * Max-plan limits plus the behavioral diagnostics ("57% of your usage was at
 * >150k context", top skills/subagents). The text is parsed into a structured
 * {@link ComprehensiveClaudeReport}; bridge helpers map each tier onto the
 * rolling-window {@link UsageBucketKey} so a poller can auto-calibrate the
 * existing buckets from real numbers. Pure + driver-agnostic (no child_process):
 * the caller runs the CLI and feeds the captured stdout in here.
 */

import type { UsageBucketKey } from './usage';

/** One subscription limit tier: percent consumed + when it resets. */
export interface MetricTier {
  /** e.g. "65%" — or "Unknown" when the line could not be parsed. */
  percentUsed: string;
  /** e.g. "Jun 23 at 10am (America/Chicago)" — or "Unknown". */
  resetsAt: string;
}

/** Behavioral telemetry for one look-back window (last 24h / last 7d). */
export interface PeriodMetrics {
  requests: number;
  sessions: number;
  /** label → percent, e.g. {"was at >150k context": "57%"}. */
  behaviors: Record<string, string>;
  /** skill → percent, e.g. {"/next-task": "1%"}. */
  topSkills: Record<string, string>;
  /** subagent → percent, e.g. {"Explore": "1%"}. */
  topSubagents: Record<string, string>;
}

/** The full structured `/usage` report. */
export interface ComprehensiveClaudeReport {
  /** ISO timestamp stamped by the parser. */
  timestamp: string;
  limits: {
    currentSession: MetricTier;
    weeklyAllModels: MetricTier;
    weeklySonnetOnly: MetricTier;
  };
  historicalAnalysis: {
    last24h: PeriodMetrics;
    last7d: PeriodMetrics;
  };
}

/** Map each limit tier in the report onto the usage bucket it calibrates. */
export const TIER_TO_BUCKET: Record<keyof ComprehensiveClaudeReport['limits'], UsageBucketKey> = {
  currentSession: 'session_5h',
  weeklyAllModels: 'weekly_total',
  weeklySonnetOnly: 'weekly_sonnet',
};

const UNKNOWN: MetricTier = { percentUsed: 'Unknown', resetsAt: 'Unknown' };

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching terminal ANSI/color escape sequences
const ANSI_RE = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/** Strip terminal ANSI control / color sequences from captured stdout. */
export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

/**
 * Parse the raw `/usage` console text into a structured report. Ported from the
 * proven reference parser; tolerant of missing sections (returns `Unknown` /
 * empty metrics rather than throwing).
 */
export function parseClaudeUsageText(rawText: string): ComprehensiveClaudeReport {
  const lines = rawText.split('\n').map((line) => line.trim());

  const parseLimitLine = (targetText: string): MetricTier => {
    const line = lines.find((l) => l.includes(targetText));
    if (!line) return { ...UNKNOWN };
    const percentMatch = line.match(/(\d+)%/);
    const resetMatch = line.match(/resets\s+([^\n\r]+)/i);
    return {
      percentUsed: percentMatch ? `${percentMatch[1]}%` : 'Unknown',
      resetsAt: resetMatch ? resetMatch[1].trim() : 'Unknown',
    };
  };

  const parsePeriodBlock = (headerText: string): PeriodMetrics => {
    const metrics: PeriodMetrics = {
      requests: 0,
      sessions: 0,
      behaviors: {},
      topSkills: {},
      topSubagents: {},
    };
    const startIndex = lines.findIndex((l) => l.startsWith(headerText));
    if (startIndex === -1) return metrics;

    const headerLine = lines[startIndex];
    const reqMatch = headerLine.match(/(\d+)\s+requests/);
    const sessMatch = headerLine.match(/(\d+)\s+sessions/);
    if (reqMatch) metrics.requests = Number.parseInt(reqMatch[1], 10);
    if (sessMatch) metrics.sessions = Number.parseInt(sessMatch[1], 10);

    let i = startIndex + 1;
    while (
      i < lines.length &&
      !lines[i].startsWith('Last ') &&
      lines[i] !== '' &&
      lines[i] !== "What's contributing to your limits usage?"
    ) {
      const line = lines[i];
      if (line.includes('was at') || line.includes('was while') || line.includes('came from')) {
        const match = line.match(/^(\d+)%\s+of your usage\s+(.*)$/);
        if (match) metrics.behaviors[match[2].trim()] = `${match[1]}%`;
      } else if (line.startsWith('Top skills:')) {
        for (const item of line.replace('Top skills:', '').split(',')) {
          const match = item.trim().match(/^(.+?)\s+(\d+)%$/);
          if (match) metrics.topSkills[match[1].trim()] = `${match[2]}%`;
        }
      } else if (line.startsWith('Top subagents:')) {
        for (const item of line.replace('Top subagents:', '').split(',')) {
          const match = item.trim().match(/^(.+?)\s+(\d+)%$/);
          if (match) metrics.topSubagents[match[1].trim()] = `${match[2]}%`;
        }
      }
      i++;
    }
    return metrics;
  };

  return {
    timestamp: new Date().toISOString(),
    limits: {
      currentSession: parseLimitLine('Current session:'),
      weeklyAllModels: parseLimitLine('Current week (all models):'),
      weeklySonnetOnly: parseLimitLine('Current week (Sonnet only):'),
    },
    historicalAnalysis: {
      last24h: parsePeriodBlock('Last 24h'),
      last7d: parsePeriodBlock('Last 7d'),
    },
  };
}

/**
 * Convert a percent-consumed string ("65%") into a 0–1 fraction. Returns null
 * for "Unknown" / unparseable input so callers can skip calibration.
 */
export function percentToFraction(percentUsed: string): number | null {
  const m = percentUsed.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const pct = Number.parseFloat(m[1]);
  if (Number.isNaN(pct)) return null;
  return Math.max(0, Math.min(1, pct / 100));
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse a `/usage` reset string like "Jun 23 at 10am (America/Chicago)" or
 * "Jun 23 at 9:59am" into epoch-ms. The timezone suffix is ignored (the value
 * is interpreted in local time — good enough for a countdown display and for
 * `bucketState`'s reset-aware windowing). The year is inferred: if the parsed
 * month/day is more than a few months in the past, roll to next year. Returns
 * undefined when the string can't be parsed (callers leave reset unset).
 */
export function parseUsageResetAt(resetsAt: string, now: number): number | undefined {
  if (!resetsAt || resetsAt === 'Unknown') return undefined;
  const m = resetsAt.trim().match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return undefined;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return undefined;
  const day = Number.parseInt(m[2], 10);
  let hour = Number.parseInt(m[3], 10);
  const minute = m[4] ? Number.parseInt(m[4], 10) : 0;
  const ampm = m[5]?.toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;

  const nowDate = new Date(now);
  let year = nowDate.getFullYear();
  let candidate = new Date(year, month, day, hour, minute, 0, 0).getTime();
  // Reset times are always in the (near) future; if we computed a time well in
  // the past, the year must have rolled over.
  if (candidate < now - 90 * 24 * 3600 * 1000) {
    year += 1;
    candidate = new Date(year, month, day, hour, minute, 0, 0).getTime();
  }
  return candidate;
}
