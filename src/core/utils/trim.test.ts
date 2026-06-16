import { describe, expect, it } from 'bun:test';
import { trim } from './trim';

describe('trim', () => {
  it('strips leading and trailing whitespace', () => {
    expect(trim('  hello  ')).toBe('hello');
    expect(trim('\n\ttabbed\t\n')).toBe('tabbed');
  });

  it('leaves an already-trimmed string unchanged', () => {
    expect(trim('hello')).toBe('hello');
  });

  it('returns undefined for inputs without a trim method', () => {
    expect(trim(null)).toBeUndefined();
    expect(trim(undefined)).toBeUndefined();
    expect(trim(42)).toBeUndefined();
  });
});
