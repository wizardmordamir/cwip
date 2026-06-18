import { describe, expect, test } from 'bun:test';
import {
  type ComprehensiveClaudeReport,
  parseClaudeUsageText,
  parseUsageResetAt,
  percentToFraction,
  stripAnsi,
  TIER_TO_BUCKET,
} from './claudeTelemetry';

const SAMPLE = `You are currently using your subscription to power your Claude Code usage

Current session: 3% used · resets Jun 18 at 5:10am (America/Chicago)
Current week (all models): 65% used · resets Jun 23 at 10am (America/Chicago)
Current week (Sonnet only): 33% used · resets Jun 23 at 9:59am (America/Chicago)

What's contributing to your limits usage?
Approximate, based on local sessions on this machine — does not include other devices or claude.ai. Behaviors are independent characteristics, not a breakdown.

Last 24h · 7922 requests · 90 sessions
  57% of your usage was at >150k context
  46% of your usage was while 4+ sessions ran in parallel
  39% of your usage came from subagent-heavy sessions
  Top skills: /release-check 1%
  Top subagents: Explore 1%, general-purpose 1%

Last 7d · 58244 requests · 498 sessions
  75% of your usage came from subagent-heavy sessions
  71% of your usage was at >150k context
  36% of your usage was while 4+ sessions ran in parallel
  13% of your usage came from sessions active for 8+ hours
  Top skills: /next-task 1%
  Top subagents: general-purpose 2%, Explore 1%, workflow-subagent 1%`;

describe('parseClaudeUsageText', () => {
  const r = parseClaudeUsageText(SAMPLE);

  test('parses the three limit tiers', () => {
    expect(r.limits.currentSession).toEqual({ percentUsed: '3%', resetsAt: 'Jun 18 at 5:10am (America/Chicago)' });
    expect(r.limits.weeklyAllModels).toEqual({ percentUsed: '65%', resetsAt: 'Jun 23 at 10am (America/Chicago)' });
    expect(r.limits.weeklySonnetOnly).toEqual({ percentUsed: '33%', resetsAt: 'Jun 23 at 9:59am (America/Chicago)' });
  });

  test('parses last24h requests/sessions/behaviors/skills/subagents', () => {
    const d = r.historicalAnalysis.last24h;
    expect(d.requests).toBe(7922);
    expect(d.sessions).toBe(90);
    expect(d.behaviors).toEqual({
      'was at >150k context': '57%',
      'was while 4+ sessions ran in parallel': '46%',
      'came from subagent-heavy sessions': '39%',
    });
    expect(d.topSkills).toEqual({ '/release-check': '1%' });
    expect(d.topSubagents).toEqual({ Explore: '1%', 'general-purpose': '1%' });
  });

  test('parses last7d block', () => {
    const d = r.historicalAnalysis.last7d;
    expect(d.requests).toBe(58244);
    expect(d.sessions).toBe(498);
    expect(d.behaviors['came from sessions active for 8+ hours']).toBe('13%');
    expect(d.topSubagents).toEqual({ 'general-purpose': '2%', Explore: '1%', 'workflow-subagent': '1%' });
  });

  test('tolerates missing sections', () => {
    const r2: ComprehensiveClaudeReport = parseClaudeUsageText('nothing useful here');
    expect(r2.limits.currentSession.percentUsed).toBe('Unknown');
    expect(r2.historicalAnalysis.last24h.requests).toBe(0);
    expect(r2.historicalAnalysis.last24h.behaviors).toEqual({});
  });

  test('handles ANSI-wrapped input after stripAnsi', () => {
    const colored = `[1mCurrent session:[0m 3% used · resets Jun 18 at 5:10am`;
    const parsed = parseClaudeUsageText(stripAnsi(colored));
    expect(parsed.limits.currentSession.percentUsed).toBe('3%');
  });
});

describe('TIER_TO_BUCKET', () => {
  test('maps each tier to its bucket', () => {
    expect(TIER_TO_BUCKET).toEqual({
      currentSession: 'session_5h',
      weeklyAllModels: 'weekly_total',
      weeklySonnetOnly: 'weekly_sonnet',
    });
  });
});

describe('percentToFraction', () => {
  test('converts percent strings', () => {
    expect(percentToFraction('65%')).toBe(0.65);
    expect(percentToFraction('0%')).toBe(0);
    expect(percentToFraction('100%')).toBe(1);
  });
  test('clamps and rejects junk', () => {
    expect(percentToFraction('150%')).toBe(1);
    expect(percentToFraction('Unknown')).toBeNull();
    expect(percentToFraction('')).toBeNull();
  });
});

describe('parseUsageResetAt', () => {
  // now = Jun 18 2026, noon-ish local
  const now = new Date(2026, 5, 18, 12, 0, 0).getTime();

  test('parses a future same-year reset with am/pm + minutes', () => {
    const at = parseUsageResetAt('Jun 23 at 9:59am (America/Chicago)', now);
    expect(at).toBeDefined();
    const d = new Date(at as number);
    expect(d.getMonth()).toBe(5); // June
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(59);
  });

  test('parses 10am with no minutes', () => {
    const d = new Date(parseUsageResetAt('Jun 23 at 10am', now) as number);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });

  test('rolls a long-past month to next year', () => {
    const d = new Date(parseUsageResetAt('Jan 2 at 3pm', now) as number);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getHours()).toBe(15);
  });

  test('returns undefined for Unknown/garbage', () => {
    expect(parseUsageResetAt('Unknown', now)).toBeUndefined();
    expect(parseUsageResetAt('nonsense', now)).toBeUndefined();
  });
});
