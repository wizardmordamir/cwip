import { describe, expect, it } from 'bun:test';
import { filterNavSearch } from './filterNavSearch';
import type { NavSearchItem } from './types';

const item = (label: string, extra: Partial<NavSearchItem> = {}): NavSearchItem => ({
  id: label,
  label,
  href: `/${label.toLowerCase()}`,
  ...extra,
});

const catalogue: NavSearchItem[] = [
  item('Dashboard'),
  item('Excel', { groupLabel: 'Automation', keywords: ['spreadsheet', 'xlsx'] }),
  item('Query Builder', { groupLabel: 'Data' }),
  item('Queries', { groupLabel: 'Data' }),
  item('Vault', { hidden: true }),
];

describe('filterNavSearch', () => {
  it('returns [] for an empty query', () => {
    expect(filterNavSearch(catalogue, '   ')).toEqual([]);
  });

  it('matches case-insensitively on the label', () => {
    const groups = filterNavSearch(catalogue, 'dash');
    expect(groups.flatMap((g) => g.items.map((i) => i.label))).toEqual(['Dashboard']);
  });

  it('finds a hub child by keyword', () => {
    const groups = filterNavSearch(catalogue, 'spreadsheet');
    expect(groups.flatMap((g) => g.items.map((i) => i.label))).toContain('Excel');
  });

  it('groups results top-level first even when a hub item ranks earlier', () => {
    // 'Excel' (hub) is inserted before 'Export' (top-level), so this also checks
    // the undefined group is hoisted to the front rather than left where it landed.
    const groups = filterNavSearch([item('Excel', { groupLabel: 'Automation' }), item('Export')], 'ex');
    expect(groups[0]?.groupLabel).toBeUndefined();
    expect(groups[0]?.items.map((i) => i.label)).toContain('Export');
    expect(groups.map((g) => g.groupLabel)).toContain('Automation');
  });

  it('ranks a label-prefix match above a substring match', () => {
    const groups = filterNavSearch([item('Reports'), item('Daily Report')], 'rep');
    const flat = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(flat[0]).toBe('Reports');
  });

  it('carries the hidden flag through', () => {
    const groups = filterNavSearch(catalogue, 'vault');
    expect(groups[0]?.items[0]?.hidden).toBe(true);
  });
});
