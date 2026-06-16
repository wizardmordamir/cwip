import { describe, expect, it } from 'bun:test';
import { resolveE2EConfig } from './config';
import { describeTarget, resolveTarget } from './resolve';
import type { Page } from './types';

// A fake Page/Locator that records the locator calls resolveTarget makes, so we
// can assert the test-id → role → text → css strategy without a real browser.
const makeFakePage = () => {
  const calls: string[] = [];
  const log = (s: string): Record<string, unknown> => {
    calls.push(s);
    return make();
  };
  const make = (): Record<string, unknown> => ({
    locator: (s: string) => log(`locator(${s})`),
    getByRole: (r: string, o?: { name?: string }) => log(`getByRole(${r}${o?.name ? `,${o.name}` : ''})`),
    getByText: (t: string, o?: { exact?: boolean }) => log(`getByText(${t}${o?.exact ? ',exact' : ''})`),
    getByLabel: (t: string) => log(`getByLabel(${t})`),
    getByPlaceholder: (t: string) => log(`getByPlaceholder(${t})`),
    nth: (n: number) => log(`nth(${n})`),
  });
  return { page: make() as unknown as Page, calls };
};

const config = resolveE2EConfig({ testIdAttribute: 'data-testid' });

describe('resolveTarget', () => {
  it('treats a bare string as a test-id', () => {
    const { page, calls } = makeFakePage();
    resolveTarget(page, 'submit', config);
    expect(calls).toEqual(['locator([data-testid="submit"])']);
  });

  it('honors a custom test-id attribute', () => {
    const { page, calls } = makeFakePage();
    resolveTarget(page, 'submit', resolveE2EConfig({ testIdAttribute: 'data-test' }));
    expect(calls[0]).toBe('locator([data-test="submit"])');
  });

  it('builds role+name, text, exactText, label, placeholder, href, css', () => {
    const role = makeFakePage();
    resolveTarget(role.page, { role: 'button', name: 'Save' }, config);
    expect(role.calls[0]).toBe('getByRole(button,Save)');

    const text = makeFakePage();
    resolveTarget(text.page, { text: 'Hello' }, config);
    expect(text.calls[0]).toBe('getByText(Hello)');

    const exact = makeFakePage();
    resolveTarget(exact.page, { exactText: 'Hello' }, config);
    expect(exact.calls[0]).toBe('getByText(Hello,exact)');

    const label = makeFakePage();
    resolveTarget(label.page, { label: 'Email' }, config);
    expect(label.calls[0]).toBe('getByLabel(Email)');

    const ph = makeFakePage();
    resolveTarget(ph.page, { placeholder: 'Search' }, config);
    expect(ph.calls[0]).toBe('getByPlaceholder(Search)');

    const href = makeFakePage();
    resolveTarget(href.page, { href: '/x' }, config);
    expect(href.calls[0]).toBe('locator(a[href="/x"])');

    const css = makeFakePage();
    resolveTarget(css.page, { css: '.thing' }, config);
    expect(css.calls[0]).toBe('locator(.thing)');
  });

  it('scopes via within and applies nth', () => {
    const { page, calls } = makeFakePage();
    resolveTarget(page, { within: 'panel', css: '.row', nth: 2 }, config);
    expect(calls).toEqual(['locator([data-testid="panel"])', 'locator(.row)', 'nth(2)']);
  });

  it('escapes quotes in test-id values', () => {
    const { page, calls } = makeFakePage();
    resolveTarget(page, 'a"b', config);
    expect(calls[0]).toBe('locator([data-testid="a\\"b"])');
  });

  it('throws on an empty target', () => {
    const { page } = makeFakePage();
    expect(() => resolveTarget(page, {}, config)).toThrow();
  });
});

describe('describeTarget', () => {
  it('summarizes a target for logs', () => {
    expect(describeTarget('submit')).toBe('testId=submit');
    expect(describeTarget({ role: 'button', name: 'Save' })).toContain('role=button');
  });
});
