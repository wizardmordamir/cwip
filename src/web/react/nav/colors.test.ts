import { describe, expect, it } from 'bun:test';
import { NAV_COLORS, readableTextOn } from './colors';

describe('NAV_COLORS', () => {
  it('is a palette of 6-digit hex colors', () => {
    expect(NAV_COLORS.length).toBeGreaterThan(0);
    for (const c of NAV_COLORS) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('readableTextOn', () => {
  it('picks dark text on light backgrounds', () => {
    expect(readableTextOn('#ffffff')).toBe('#111827');
    expect(readableTextOn('#fde68a')).toBe('#111827'); // pale amber
  });
  it('picks light text on dark backgrounds', () => {
    expect(readableTextOn('#000000')).toBe('#ffffff');
    expect(readableTextOn('#3b82f6')).toBe('#ffffff'); // blue
    expect(readableTextOn('#1e3a8a')).toBe('#ffffff'); // navy
  });
  it('tolerates a missing leading # and bad input', () => {
    expect(readableTextOn('ffffff')).toBe('#111827');
    expect(readableTextOn('nonsense')).toBe('#ffffff');
  });
});
