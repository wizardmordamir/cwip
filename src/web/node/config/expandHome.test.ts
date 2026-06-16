import { describe, expect, it } from 'bun:test';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { expandHome } from '.';

describe('expandHome', () => {
  it('expands a lone tilde to the home dir', () => {
    expect(expandHome('~')).toBe(homedir());
  });

  it('expands ~/ prefixes', () => {
    expect(expandHome('~/code/app')).toBe(join(homedir(), 'code/app'));
  });

  it('resolves relative and absolute paths', () => {
    expect(expandHome('/abs/path')).toBe('/abs/path');
    expect(expandHome('rel')).toBe(resolve('rel'));
  });
});
