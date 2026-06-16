// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these tests assert on literal ${...} placeholder syntax, not template strings
import { describe, expect, it } from 'bun:test';
import { interpolate, interpolateWith } from '.';

describe('interpolate', () => {
  it('substitutes from a record and a resolver function', () => {
    expect(interpolate('Hi ${user}!', { user: 'Ada' })).toBe('Hi Ada!');
    expect(interpolate('${a}/${b}', (k) => ({ a: '1', b: '2' })[k])).toBe('1/2');
  });

  it('trims placeholder whitespace and replaces unresolved with empty by default', () => {
    expect(interpolate('${ name }-${missing}', { name: 'x' })).toBe('x-');
  });

  it('honors onMissing: keep / throw / function', () => {
    expect(interpolate('${a}', {}, { onMissing: 'keep' })).toBe('${a}');
    expect(() => interpolate('${a}', {}, { onMissing: 'throw' })).toThrow('no value for "a"');
    expect(interpolate('${a}', {}, { onMissing: (n) => `<${n}>` })).toBe('<a>');
  });
});

describe('interpolateWith', () => {
  it('reports used and missing names', () => {
    const result = interpolateWith('${a} ${b} ${a}', { a: '1' });
    expect(result.value).toBe('1  1'); // b → '', both ${a} resolve
    expect(result.used).toEqual(['a']); // de-duplicated
    expect(result.missing).toEqual(['b']);
  });

  it('supports secret-redaction flagging via the used names (no extra API needed)', () => {
    // The pattern: namespaced sources (scraped.*, run.*) are public; anything
    // else that resolved came from vars/env and is a secret to redact.
    const ctx = { scraped: { id: '42' }, env: { TOKEN: 'hunter2' } };
    const resolve = (name: string) =>
      name.startsWith('scraped.') ? ctx.scraped[name.slice(8) as 'id'] : ctx.env[name as 'TOKEN'];
    const isSecret = (name: string) => !name.startsWith('scraped.') && !name.startsWith('run.');

    const result = interpolateWith('id=${scraped.id} token=${TOKEN} x=${MISSING}', resolve);
    expect(result.value).toBe('id=42 token=hunter2 x=');
    expect(result.used.some(isSecret)).toBe(true); // TOKEN resolved → redact
    expect(result.missing).toEqual(['MISSING']); // missing never marks secret

    const clean = interpolateWith('id=${scraped.id}', resolve);
    expect(clean.used.some(isSecret)).toBe(false);
  });
});
