/**
 * Compiles a simple filename glob into an anchored RegExp.
 *
 * Supported wildcards (filename-style, not full path globbing):
 *   `*`  — matches any run of characters (including none)
 *   `?`  — matches exactly one character
 * Every other character is matched literally (regex metacharacters are escaped),
 * and the pattern is anchored so it must match the whole string. A pattern with
 * no wildcards therefore behaves as an exact-equality check.
 *
 *   globToRegExp('*.log').test('error.log')   // true
 *   globToRegExp('*.skip*').test('a.skip.ts') // true
 */
export const globToRegExp = (pattern: string): RegExp => {
  let out = '';
  for (const ch of pattern) {
    if (ch === '*') {
      out += '.*';
    } else if (ch === '?') {
      out += '.';
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
};

/**
 * True when `name` matches any of the given glob `patterns` (see `globToRegExp`).
 * Handy for ignore-lists when walking a directory tree:
 *
 *   matchesGlob('node_modules', ['node_modules', '*.skip*']) // true
 *   matchesGlob('index.ts', ['*.log', '*.tmp'])              // false
 */
export const matchesGlob = (name: string, patterns: string[]): boolean => {
  if (!name || !Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }
  return patterns.some((pattern) => globToRegExp(pattern).test(name));
};
