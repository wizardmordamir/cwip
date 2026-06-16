import { describe, expect, it } from 'bun:test';
import { globToRegExp, matchesGlob } from '.';

describe('globToRegExp', () => {
  it('matches `*` as any run of characters', () => {
    expect(globToRegExp('*.log').test('error.log')).toBe(true);
    expect(globToRegExp('*.log').test('error.log.gz')).toBe(false);
    expect(globToRegExp('*.skip*').test('a.skip.ts')).toBe(true);
  });

  it('matches `?` as exactly one character', () => {
    expect(globToRegExp('file?.ts').test('file1.ts')).toBe(true);
    expect(globToRegExp('file?.ts').test('file.ts')).toBe(false);
  });

  it('anchors the whole string and escapes regex metacharacters', () => {
    expect(globToRegExp('a.b').test('a.b')).toBe(true);
    expect(globToRegExp('a.b').test('axb')).toBe(false); // dot is literal, not "any char"
    expect(globToRegExp('index.ts').test('xindex.tsx')).toBe(false);
  });
});

describe('matchesGlob', () => {
  it('returns true when any pattern matches', () => {
    expect(matchesGlob('node_modules', ['node_modules', '*.skip*'])).toBe(true);
    expect(matchesGlob('a.skip.ts', ['dist', '*.skip*'])).toBe(true);
  });

  it('returns false when nothing matches or inputs are empty', () => {
    expect(matchesGlob('index.ts', ['*.log', '*.tmp'])).toBe(false);
    expect(matchesGlob('index.ts', [])).toBe(false);
    expect(matchesGlob('', ['*'])).toBe(false);
  });
});
