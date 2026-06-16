import { describe, expect, it } from 'bun:test';
import {
  buildSnippet,
  escapeLike,
  firstMatchSnippet,
  firstNonEmptyValue,
  jsonValuesMatch,
  likePattern,
  snippetForLabel,
  valueToText,
} from './index';

describe('valueToText', () => {
  it('flattens primitives, arrays and labelled objects', () => {
    expect(valueToText(null)).toBe('');
    expect(valueToText(42)).toBe('42');
    expect(valueToText(['a', 'b', ''])).toBe('a, b');
    expect(valueToText({ label: 'Pick me', other: 1 })).toBe('Pick me');
    expect(valueToText({ name: 'Bob' })).toBe('Bob');
    expect(valueToText({ x: 1 })).toBe('{"x":1}');
  });
});

describe('buildSnippet', () => {
  it('excerpts around the match (case-insensitive) with ellipses on trimmed ends', () => {
    const text = 'the quick brown fox jumps over the lazy dog and keeps running far';
    const snip = buildSnippet(text, 'FOX', { context: 5 });
    expect(snip).toContain('fox');
    expect(snip?.startsWith('…')).toBe(true);
    expect(snip?.endsWith('…')).toBe(true);
    // Only ~5 chars of context each side, so far-away words are excluded.
    expect(snip).not.toContain('quick');
    expect(snip).not.toContain('lazy');
  });
  it('returns undefined when the query is absent', () => {
    expect(buildSnippet('hello world', 'zzz')).toBeUndefined();
  });
  it('omits the ellipses when the whole string fits in the context window', () => {
    expect(buildSnippet('hello world', 'hello', { context: 100 })).toBe('hello world');
  });
});

describe('snippetForLabel', () => {
  it('suppresses the snippet when the match is already in the label', () => {
    expect(snippetForLabel('My Budget notes', 'My Budget', 'budget')).toBeUndefined();
  });
  it('returns a snippet when the match is only in the body', () => {
    const snip = snippetForLabel('a hidden keyword here', 'Some title', 'keyword', { context: 3 });
    expect(snip).toContain('keyword');
  });
});

describe('jsonValuesMatch / firstMatchSnippet / firstNonEmptyValue (secret safety)', () => {
  const row = { title: 'My bank', username: 'alice', password: 'hunter2-secret' };

  it('matches a normal field', () => {
    expect(jsonValuesMatch(row, 'alice')).toBe(true);
  });
  it('does NOT match a value in an excluded (secret) key', () => {
    expect(jsonValuesMatch(row, 'hunter2', ['password'])).toBe(false);
  });
  it('never excerpts an excluded key, but excerpts a normal match', () => {
    expect(firstMatchSnippet(row, 'hunter2', { exclude: ['password'] })).toBeUndefined();
    expect(firstMatchSnippet(row, 'alice')).toBe('alice');
  });
  it('reads a raw JSON string and labels by first non-empty included field', () => {
    const raw = JSON.stringify({ password: 's3cret', title: 'Visible' });
    expect(firstNonEmptyValue(raw, ['password'])).toBe('Visible');
  });
});

describe('escapeLike / likePattern', () => {
  it('escapes wildcards and the escape char', () => {
    expect(escapeLike('50%_off\\x')).toBe('50\\%\\_off\\\\x');
  });
  it('wraps in a contains pattern', () => {
    expect(likePattern('abc')).toBe('%abc%');
    expect(likePattern('a%b')).toBe('%a\\%b%');
  });
});
