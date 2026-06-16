import { describe, expect, it } from 'bun:test';
import { toTable } from '.';

describe('toTable', () => {
  it('aligns columns to fit the header and cells', () => {
    const out = toTable([
      { name: 'Ada', age: 36 },
      { name: 'Bo', age: 9 },
    ]);
    expect(out).toBe(['name  age', 'Ada   36', 'Bo    9'].join('\n'));
  });

  it('infers columns in first-seen order and renders nullish as empty', () => {
    const out = toTable([{ a: 1 }, { a: 2, b: 3 }]);
    expect(out.split('\n')[0]).toBe('a  b');
    expect(out.split('\n')[1]).toBe('1'); // trailing empty cell trimmed
  });

  it('respects an explicit column subset and order', () => {
    const out = toTable([{ a: 1, b: 2, c: 3 }], ['c', 'a']);
    expect(out).toBe(['c  a', '3  1'].join('\n'));
  });
});
