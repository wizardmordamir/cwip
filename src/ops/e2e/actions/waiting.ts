import { sleep } from '../../../core/utils/sleep';
import { act } from '../act';
import { resolveTarget } from '../resolve';
import type { E2EAction, Target } from '../types';

/** Wait for a target to become visible. */
export const waitFor = (target: Target): E2EAction =>
  act(
    'waitFor',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .waitFor({ state: 'visible', timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Wait for a target to disappear (detached or hidden). */
export const waitForHidden = (target: Target): E2EAction =>
  act(
    'waitForHidden',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .waitFor({ state: 'hidden', timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** A fixed delay. Prefer event-based waits; reserve this for genuine timers (poll intervals). */
export const waitMs = (ms: number): E2EAction => act('waitMs', async () => sleep(ms));

/** Wait until the URL matches (substring or RegExp). */
export const waitForUrl = (match: string | RegExp): E2EAction =>
  act(
    'waitForUrl',
    async (ctx) => {
      const matcher = typeof match === 'string' ? (url: URL) => url.toString().includes(match) : match;
      await ctx.page.waitForURL(matcher, { timeout: ctx.config.timeouts.navigation });
    },
    match,
  );

/** Wait for network to go idle. */
export const waitForNetworkIdle = (): E2EAction =>
  act('waitForNetworkIdle', async (ctx) => {
    await ctx.page.waitForLoadState('networkidle', { timeout: ctx.config.timeouts.network });
  });
