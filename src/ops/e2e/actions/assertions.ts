import { act } from '../act';
import { poll } from '../poll';
import { resolveTarget } from '../resolve';
import type { E2EAction, Target } from '../types';

/** Assert a target is visible. */
export const expectVisible = (target: Target): E2EAction =>
  act(
    'expectVisible',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .waitFor({ state: 'visible', timeout: ctx.config.timeouts.expect });
    },
    target,
  );

/** Assert a target is not visible (hidden or absent). */
export const expectHidden = (target: Target): E2EAction =>
  act(
    'expectHidden',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .waitFor({ state: 'hidden', timeout: ctx.config.timeouts.expect });
    },
    target,
  );

/** Assert some element with the given text is visible on the page. */
export const expectText = (text: string): E2EAction =>
  act(
    'expectText',
    async (ctx) => {
      await ctx.page.getByText(text).first().waitFor({ state: 'visible', timeout: ctx.config.timeouts.expect });
    },
    { text },
  );

/** Assert every text in the list is visible. */
export const expectEachText = (texts: string[]): E2EAction =>
  act(
    'expectEachText',
    async (ctx) => {
      for (const text of texts) {
        await ctx.page.getByText(text).first().waitFor({ state: 'visible', timeout: ctx.config.timeouts.expect });
      }
    },
    { texts },
  );

/** Assert exactly `n` elements match. */
export const expectCount = (target: Target, n: number): E2EAction =>
  act(
    'expectCount',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config);
      await poll(
        async () => {
          const c = await loc.count();
          if (c !== n) throw new Error(`expected ${n} elements, found ${c}`);
        },
        { timeout: ctx.config.timeouts.expect, intervals: ctx.config.retryIntervals },
      );
    },
    target,
  );

/** Assert at least `n` elements match. */
export const expectCountAtLeast = (target: Target, n: number): E2EAction =>
  act(
    'expectCountAtLeast',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config);
      await poll(
        async () => {
          const c = await loc.count();
          if (c < n) throw new Error(`expected at least ${n} elements, found ${c}`);
        },
        { timeout: ctx.config.timeouts.expect, intervals: ctx.config.retryIntervals },
      );
    },
    target,
  );

/** Assert the URL matches (substring or RegExp). */
export const expectUrl = (match: string | RegExp): E2EAction =>
  act(
    'expectUrl',
    async (ctx) => {
      await poll(
        async () => {
          const url = ctx.page.url();
          const ok = typeof match === 'string' ? url.includes(match) : match.test(url);
          if (!ok) throw new Error(`url "${url}" did not match ${match}`);
        },
        { timeout: ctx.config.timeouts.navigation, intervals: ctx.config.retryIntervals },
      );
    },
    match,
  );

/** Assert the document title matches (exact string or RegExp). */
export const expectTitle = (match: string | RegExp): E2EAction =>
  act(
    'expectTitle',
    async (ctx) => {
      await poll(
        async () => {
          const t = await ctx.page.title();
          const ok = typeof match === 'string' ? t === match : match.test(t);
          if (!ok) throw new Error(`title "${t}" did not match ${match}`);
        },
        { timeout: ctx.config.timeouts.expect, intervals: ctx.config.retryIntervals },
      );
    },
    match,
  );

/** Assert an input/select/textarea's current value equals `value`. */
export const expectValue = (target: Target, value: string): E2EAction =>
  act(
    'expectValue',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config).first();
      await poll(
        async () => {
          const actual = await loc.inputValue();
          if (actual !== value) throw new Error(`value "${actual}" did not equal "${value}"`);
        },
        { timeout: ctx.config.timeouts.expect, intervals: ctx.config.retryIntervals },
      );
    },
    target,
  );

/** Assert a target's attribute equals `value`. */
export const expectAttribute = (target: Target, attribute: string, value: string): E2EAction =>
  act(
    'expectAttribute',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config).first();
      await poll(
        async () => {
          const actual = await loc.getAttribute(attribute);
          if (actual !== value) throw new Error(`attribute ${attribute}="${actual}" did not equal "${value}"`);
        },
        { timeout: ctx.config.timeouts.expect, intervals: ctx.config.retryIntervals },
      );
    },
    target,
  );

/** Assert an alert/toast with the given message is visible. */
export const expectToast = (message: string): E2EAction =>
  act(
    'expectToast',
    async (ctx) => {
      await ctx.page
        .getByRole('alert')
        .filter({ hasText: message })
        .first()
        .waitFor({ state: 'visible', timeout: ctx.config.timeouts.expect });
    },
    { message },
  );
