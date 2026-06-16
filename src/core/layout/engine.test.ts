import { describe, expect, test } from 'bun:test';
import { computeAggregate, computeDistribution } from './aggregate';
import type { LayoutField } from './field';
import { nodeBoxClass, nodeGridClass } from './grid';
import { resolveBinding } from './resolve';
import { addInTree, moveInTree, removeInTree, reorderInContainer, updateInTree } from './treeOps';
import type { LayoutNode } from './types';

const n = (id: string, extra: Partial<LayoutNode> = {}): LayoutNode => ({
  id,
  type: 'keyValue',
  binding: { kind: 'static' },
  ...extra,
});

describe('treeOps', () => {
  test('add/remove/update at top level and inside a container', () => {
    const sec = n('sec', { type: 'section', children: [n('a')] });
    let tree = [sec, n('b')];
    tree = addInTree(tree, n('c'), 'sec');
    expect(findChildIds(tree, 'sec')).toEqual(['a', 'c']);
    tree = addInTree(tree, n('d'), null);
    expect(tree.map((x) => x.id)).toEqual(['sec', 'b', 'd']);
    tree = updateInTree(tree, 'a', { width: 'half' });
    expect(tree[0].children?.[0].width).toBe('half');
    tree = removeInTree(tree, 'a');
    expect(findChildIds(tree, 'sec')).toEqual(['c']);
    tree = removeInTree(tree, 'b');
    expect(tree.map((x) => x.id)).toEqual(['sec', 'd']);
  });

  test('reorder within a container; move between levels', () => {
    let tree = [n('sec', { type: 'section', children: [n('a'), n('b')] }), n('x')];
    tree = reorderInContainer(tree, ['b', 'a'], 'sec');
    expect(findChildIds(tree, 'sec')).toEqual(['b', 'a']);
    tree = moveInTree(tree, 'a', null); // out of the section, to top level
    expect(findChildIds(tree, 'sec')).toEqual(['b']);
    expect(tree.map((t) => t.id)).toContain('a');
  });
});

describe('computeAggregate / computeDistribution', () => {
  const rows = [
    { id: 1, amount: 10, done: true, tag: ['x', 'y'] },
    { id: 2, amount: 30, done: false, tag: ['x'] },
    { id: 3, amount: '', done: true, tag: [] },
  ];
  test('count / sum / avg / progress / distinct', () => {
    expect(computeAggregate('count', undefined, rows)).toBe(3);
    expect(computeAggregate('sum', 'amount', rows)).toBe(40);
    expect(computeAggregate('avg', 'amount', rows)).toBe(20);
    expect(computeAggregate('countTrue', 'done', rows)).toBe(2);
    expect(computeAggregate('progress', 'done', rows)).toBeCloseTo(2 / 3);
    expect(computeAggregate('distinctCount', 'tag', rows)).toBe(2); // x, y
    expect(computeAggregate('sum', undefined, rows)).toBeNull(); // sum needs a key
  });
  test('distribution is most-common first, empties as —', () => {
    expect(computeDistribution('tag', rows)).toEqual([
      { label: 'x', value: 2 },
      { label: 'y', value: 1 },
    ]);
  });
});

describe('resolveBinding', () => {
  const fields: LayoutField[] = [{ key: 'name', label: 'Name', type: 'text' }];
  const env = { fieldByKey: new Map(fields.map((f) => [f.key, f])), row: { name: 'Ada' }, rows: [] };
  test('column resolves to field+value; missing column → unresolved', () => {
    expect(resolveBinding(n('1', { binding: { kind: 'column', key: 'name' } }), env)).toEqual({
      kind: 'column',
      field: fields[0],
      value: 'Ada',
    });
    expect(resolveBinding(n('2', { binding: { kind: 'column', key: 'gone' } }), env)).toEqual({
      kind: 'unresolved',
    });
  });
  test('pinned/slot kinds are unresolved by the core resolver', () => {
    expect(resolveBinding(n('3', { binding: { kind: 'slot', slotId: 's' } }), env).kind).toBe('unresolved');
  });
});

describe('grid class maps', () => {
  test('span wins over width; style box classes', () => {
    expect(nodeGridClass(n('1', { width: 'half' }))).toBe('col-span-12 sm:col-span-6');
    expect(nodeGridClass(n('2', { span: 4 }))).toBe('col-span-12 sm:col-span-4');
    expect(nodeBoxClass({ fill: 'card', radius: 'lg' })).toContain('rounded-xl');
  });
});

const findChildIds = (tree: LayoutNode[], containerId: string): string[] =>
  (tree.find((t) => t.id === containerId)?.children ?? []).map((c) => c.id);
