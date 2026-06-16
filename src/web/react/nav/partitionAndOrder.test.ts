import { describe, expect, it } from 'bun:test';
import { orderRank, partitionAndOrder } from './partitionAndOrder';
import type { NavEntry } from './types';

const entry = (id: string, hidden = false): NavEntry => ({ id, label: id, href: `/${id}`, hidden });

describe('orderRank', () => {
  it('returns the index of a listed id', () => {
    expect(orderRank(['a', 'b', 'c'], 'b')).toBe(1);
  });
  it('returns +∞ for an unlisted id so it sorts last', () => {
    expect(orderRank(['a'], 'z')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('partitionAndOrder', () => {
  it('splits hidden from visible and sorts visible by saved order', () => {
    const entries = [entry('a'), entry('b'), entry('c'), entry('d', true)];
    const { visible, hidden } = partitionAndOrder(entries, ['c', 'a']);
    expect(visible.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(hidden.map((e) => e.id)).toEqual(['d']);
  });

  it('keeps natural order for entries missing from the saved order (stable)', () => {
    const entries = [entry('a'), entry('b'), entry('c')];
    const { visible } = partitionAndOrder(entries, []);
    expect(visible.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the hidden list in natural order regardless of saved order', () => {
    const entries = [entry('x', true), entry('y', true)];
    const { hidden } = partitionAndOrder(entries, ['y', 'x']);
    expect(hidden.map((e) => e.id)).toEqual(['x', 'y']);
  });
});
