import { describe, expect, it } from 'bun:test';
import { partitionDismissible } from './useDismissibleItems';

const items = [
  { id: 'a', n: 1 },
  { id: 'b', n: 2 },
  { id: 'c', n: 3 },
];
const key = (i: { id: string }) => i.id;

describe('partitionDismissible', () => {
  it('splits a catalog into visible vs hidden, preserving order', () => {
    const { visible, hiddenItems } = partitionDismissible(items, key, ['b']);
    expect(visible.map(key)).toEqual(['a', 'c']);
    expect(hiddenItems.map(key)).toEqual(['b']);
  });

  it('returns everything visible when nothing is hidden', () => {
    const { visible, hiddenItems } = partitionDismissible(items, key, []);
    expect(visible).toHaveLength(3);
    expect(hiddenItems).toHaveLength(0);
  });

  it('ignores stale hidden ids not present in the catalog', () => {
    const { visible, hiddenItems } = partitionDismissible(items, key, ['gone', 'a']);
    expect(visible.map(key)).toEqual(['b', 'c']);
    expect(hiddenItems.map(key)).toEqual(['a']);
  });
});
