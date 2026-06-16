import { pipeAsync } from '../../core/flow/pipeAsync';
import { act } from './act';
import { resolveE2EConfig } from './config';
import { instrumentPage } from './recorder';
import type { AttachableTestInfo, E2EAction, E2EConfig, E2EContext, Page, ResolvedE2EConfig } from './types';

export interface E2ESeed {
  page: Page;
  /** Initial shared state threaded through the pipe. */
  state?: Record<string, unknown>;
  /** Pass a Playwright `TestInfo` so captured artifacts attach to the run natively. */
  testInfo?: AttachableTestInfo;
}

export interface E2EKit {
  config: ResolvedE2EConfig;
  /** Build a context from a page (attaching the console/network recorder). */
  context(seed: E2ESeed): E2EContext;
  /** Compose actions into a runnable: `run(a, b, c)({ page })`. */
  run(...actions: E2EAction[]): (seed: E2ESeed | E2EContext) => Promise<E2EContext>;
  /** Group actions under one named step (shows up as one entry; captured together on failure). */
  step(label: string, ...actions: E2EAction[]): E2EAction;
}

const isContext = (s: E2ESeed | E2EContext): s is E2EContext => 'recorder' in s && 'config' in s;

/**
 * Create a configured E2E kit — the one place an app's differences (base url,
 * test-id attribute, timeouts, capture policy) live. Actions read this config off
 * the context, so the same action library works across apps:
 *
 *   const e2e = createE2E({ baseUrl: 'http://localhost:5080' });
 *   await e2e.run(goTo('/'), click('new-note'), expectText('Untitled'))({ page });
 */
export const createE2E = (config: E2EConfig = {}): E2EKit => {
  const resolved = resolveE2EConfig(config);

  const context = (seed: E2ESeed): E2EContext => ({
    page: seed.page,
    config: resolved,
    state: seed.state ?? {},
    recorder: instrumentPage(seed.page, resolved),
    ...(seed.testInfo !== undefined && { testInfo: seed.testInfo }),
  });

  const run =
    (...actions: E2EAction[]) =>
    async (seed: E2ESeed | E2EContext): Promise<E2EContext> => {
      const ctx = isContext(seed) ? seed : context(seed);
      if (!actions.length) return ctx;
      return (await pipeAsync(...(actions as [E2EAction]))(ctx)) as E2EContext;
    };

  const step = (label: string, ...actions: E2EAction[]): E2EAction =>
    act(`step:${label}`, async (ctx) => {
      await pipeAsync(...(actions as [E2EAction]))(ctx);
    });

  return { config: resolved, context, run, step };
};
