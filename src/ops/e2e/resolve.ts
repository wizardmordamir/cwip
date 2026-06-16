import type { Locator, Page, ResolvedE2EConfig, Target } from './types';

// Escape a value for use inside a CSS attribute selector's double quotes.
const cssAttr = (v: string): string => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

type Scope = Pick<Page, 'locator' | 'getByRole' | 'getByText' | 'getByLabel' | 'getByPlaceholder'>;

/**
 * Resolve a `Target` to a Playwright `Locator`, generalizing the test-id → role →
 * text → css hierarchy. A bare string is a test-id; the object form selects one
 * strategy (and may be scoped with `within`). Resilient by construction: prefer
 * `testId`/`role` (stable) and fall back to text/css only when asked.
 */
export const resolveTarget = (page: Page, target: Target, config: ResolvedE2EConfig): Locator => {
  const t = typeof target === 'string' ? { testId: target } : target;
  const scope: Scope = t.within ? resolveTarget(page, t.within, config) : page;

  const exactOpt = t.exact != null ? { exact: t.exact } : undefined;
  let loc: Locator;
  if (t.testId != null) loc = scope.locator(`[${config.testIdAttribute}="${cssAttr(t.testId)}"]`);
  else if (t.role != null) {
    const opts: { name?: string | RegExp; exact?: boolean; level?: number } = {};
    if (t.name != null) opts.name = t.name;
    if (t.exact != null) opts.exact = t.exact;
    if (t.level != null) opts.level = t.level;
    loc = scope.getByRole(t.role as Parameters<Scope['getByRole']>[0], Object.keys(opts).length ? opts : undefined);
  } else if (t.label != null) loc = scope.getByLabel(t.label, exactOpt);
  else if (t.placeholder != null) loc = scope.getByPlaceholder(t.placeholder, exactOpt);
  else if (t.exactText != null) loc = scope.getByText(t.exactText, { exact: true });
  else if (t.text != null) loc = scope.getByText(t.text, exactOpt);
  else if (t.href != null) loc = scope.locator(`a[href="${cssAttr(t.href)}"]`);
  else if (t.css != null) loc = scope.locator(t.css);
  else throw new Error('resolveTarget: target selected no strategy (empty object)');

  return t.nth != null ? loc.nth(t.nth) : loc;
};

/** A short human description of a target, for error messages/labels. */
export const describeTarget = (target: Target): string => {
  if (typeof target === 'string') return `testId=${target}`;
  const parts = Object.entries(target)
    .filter(([k, v]) => k !== 'within' && v != null)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? describeTarget(v as Target) : String(v)}`);
  return parts.join(' ') || '(empty)';
};
