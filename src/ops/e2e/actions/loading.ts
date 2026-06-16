import { act } from '../act';
import { resolveUrl } from '../config';
import { resolveTarget } from '../resolve';
import type { E2EAction, Target } from '../types';

/** Navigate to a path (resolved against the config base url) or absolute url. */
export const goTo = (
  pathOrUrl: string,
  opts?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' },
): E2EAction =>
  act('goTo', async (ctx) => {
    await ctx.page.goto(resolveUrl(ctx.config, pathOrUrl), {
      timeout: ctx.config.timeouts.navigation,
      waitUntil: opts?.waitUntil ?? 'domcontentloaded',
    });
  });

/** Reload the current page. */
export const reload = (): E2EAction =>
  act('reload', async (ctx) => {
    await ctx.page.reload({ timeout: ctx.config.timeouts.navigation });
  });

/** Click a dismiss target only if it's currently visible (e.g. a one-time modal). No-op otherwise. */
export const dismissDialog = (target: Target): E2EAction =>
  act(
    'dismissDialog',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.click({ timeout: ctx.config.timeouts.action });
        await loc.waitFor({ state: 'hidden', timeout: ctx.config.timeouts.action }).catch(() => {});
      }
    },
    target,
  );
