/**
 * Substitute `${name}` placeholders in a template from a resolver. Generalized
 * from an app's automation interpreter: instead of hard-wired var sources, you
 * pass a `resolve(name)` function (or a plain record), so the same primitive
 * serves env expansion, config templating, prompt building, etc.
 *
 *   interpolate('Hi ${user}', { user: 'Ada' })            // 'Hi Ada'
 *   interpolate('${a}/${b}', (k) => lookup[k])            // resolver function
 *
 * An unresolved placeholder (resolver returns `null`/`undefined`) becomes `''` by
 * default; pass `onMissing` to throw, keep the literal, or supply a fallback.
 */
export type Resolver = Record<string, string | null | undefined> | ((name: string) => string | null | undefined);

export interface InterpolateOptions {
  /**
   * What to do when a placeholder doesn't resolve:
   *   `'empty'`  → replace with `''` (default)
   *   `'keep'`   → leave the literal `${name}` in place
   *   `'throw'`  → throw an Error naming the missing key
   *   function   → called with the name; its return is substituted
   */
  onMissing?: 'empty' | 'keep' | 'throw' | ((name: string) => string);
}

const PLACEHOLDER = /\$\{([^}]+)\}/g;

const toFn = (resolver: Resolver): ((name: string) => string | null | undefined) =>
  typeof resolver === 'function' ? resolver : (name) => resolver[name];

export const interpolate = (template: string, resolver: Resolver, options: InterpolateOptions = {}): string => {
  const resolve = toFn(resolver);
  const onMissing = options.onMissing ?? 'empty';

  return template.replace(PLACEHOLDER, (literal, rawName) => {
    const name = String(rawName).trim();
    const value = resolve(name);
    if (value !== null && value !== undefined) {
      return value;
    }
    if (typeof onMissing === 'function') {
      return onMissing(name);
    }
    switch (onMissing) {
      case 'keep':
        return literal;
      case 'throw':
        throw new Error(`interpolate: no value for "${name}"`);
      default:
        return '';
    }
  });
};

/**
 * Like `interpolate`, but also reports which placeholder names were used and
 * which were missing — handy for validating a template against its data or for
 * flagging that a substitution pulled in a secret (the missing/used split lets a
 * caller redact resolved values before logging).
 */
export interface InterpolateResult {
  value: string;
  /** Names that resolved to a value. */
  used: string[];
  /** Names that had no value. */
  missing: string[];
}

export const interpolateWith = (
  template: string,
  resolver: Resolver,
  options: InterpolateOptions = {},
): InterpolateResult => {
  const resolve = toFn(resolver);
  const used = new Set<string>();
  const missing = new Set<string>();
  const onMissing = options.onMissing ?? 'empty';

  const value = template.replace(PLACEHOLDER, (literal, rawName) => {
    const name = String(rawName).trim();
    const resolved = resolve(name);
    if (resolved !== null && resolved !== undefined) {
      used.add(name);
      return resolved;
    }
    missing.add(name);
    if (typeof onMissing === 'function') {
      return onMissing(name);
    }
    switch (onMissing) {
      case 'keep':
        return literal;
      case 'throw':
        throw new Error(`interpolate: no value for "${name}"`);
      default:
        return '';
    }
  });

  return { value, used: [...used], missing: [...missing] };
};
