import { captureArtifacts } from './capture';
import { type E2EAction, E2EActionError, type E2EContext } from './types';

const currentUrl = (ctx: E2EContext): string | undefined => {
  try {
    return ctx.page.url();
  } catch {
    return undefined;
  }
};

/**
 * Wrap an action body with the shared resilience + debug behavior: optionally
 * capture per-step, and on failure auto-capture screenshot/HTML/console/network
 * then rethrow an `E2EActionError` carrying the action name, url, target and the
 * captured artifacts. Every cwip/e2e action is built on this.
 */
export const act = (name: string, body: (ctx: E2EContext) => Promise<void>, target?: unknown): E2EAction => {
  return async (ctx) => {
    ctx.config.logger?.debug?.(`e2e: ${name}`);
    try {
      await body(ctx);
      if (ctx.config.capture.perStep) await captureArtifacts(ctx, name, { failure: false });
      return ctx;
    } catch (err) {
      let artifacts;
      if (ctx.config.capture.onFailure) {
        await captureArtifacts(ctx, `FAIL-${name}`, { failure: true });
        artifacts = ctx.recorder.artifacts();
      }
      throw new E2EActionError(name, err, {
        ...(currentUrl(ctx) !== undefined && { url: currentUrl(ctx) }),
        ...(target !== undefined && { target }),
        ...(artifacts?.length && { artifacts }),
      });
    }
  };
};
