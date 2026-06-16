import { describe, expect, it } from 'bun:test';
import { applyManagedBlock, extractManagedBlock, hasManagedBlock } from './managedBlock';
import { mergeManagedKeys } from './mergeManagedKeys';

describe('managedBlock', () => {
  it('appends a block when absent', () => {
    const out = applyManagedBlock('const a = 1;\n', 'x', 'const dedupe = [];');
    expect(hasManagedBlock(out, 'x')).toBe(true);
    expect(out).toContain('const a = 1;');
    expect(out).toContain('const dedupe = [];');
  });

  it('replaces the block body on a second apply (idempotent count)', () => {
    const first = applyManagedBlock('top\n', 'x', 'OLD');
    const second = applyManagedBlock(first, 'x', 'NEW');
    expect((second.match(/>>> cwip:x/g) ?? []).length).toBe(1);
    expect(second).toContain('NEW');
    expect(second).not.toContain('OLD');
    expect(second).toContain('top');
  });

  it('extracts the block body', () => {
    const out = applyManagedBlock('', 'y', 'line1\nline2');
    expect(extractManagedBlock(out, 'y')).toBe('line1\nline2');
    expect(extractManagedBlock(out, 'missing')).toBeUndefined();
  });

  it('supports a custom comment token (TOML)', () => {
    const out = applyManagedBlock('[test]\n', 'z', 'preload = []', '#');
    expect(out).toContain('# >>> cwip:z');
    expect(hasManagedBlock(out, 'z', '#')).toBe(true);
  });
});

describe('mergeManagedKeys', () => {
  it('overwrites managed keys and reports the changed ones', () => {
    const { merged, changed } = mergeManagedKeys({ dev: 'old', custom: 'keep' }, { dev: 'vite', build: 'vite build' });
    expect(merged).toEqual({ dev: 'vite', custom: 'keep', build: 'vite build' });
    expect(changed.sort()).toEqual(['build', 'dev']);
  });

  it('reports nothing changed when already current', () => {
    const { changed } = mergeManagedKeys({ dev: 'vite' }, { dev: 'vite' });
    expect(changed).toEqual([]);
  });

  it('handles a missing existing map', () => {
    const { merged, changed } = mergeManagedKeys(undefined, { test: 'bun test' });
    expect(merged).toEqual({ test: 'bun test' });
    expect(changed).toEqual(['test']);
  });
});
