import { act } from '../act';
import { emitArtifact } from '../capture';
import type { E2EAction, E2EContext } from '../types';

/** Capture a named screenshot artifact (attached to the run regardless of pass/fail). */
export const screenshot = (name: string): E2EAction =>
  act('screenshot', async (ctx) => {
    const buf = await ctx.page.screenshot({ fullPage: true });
    await emitArtifact(ctx, 'screenshot', `${name}.png`, buf, 'image/png');
  });

/** Capture the current page HTML as a named artifact. */
export const snapshotHtml = (name: string): E2EAction =>
  act('snapshotHtml', async (ctx) => {
    const html = await ctx.page.content();
    await emitArtifact(ctx, 'html', `${name}.html`, html, 'text/html');
  });

/** Run arbitrary page logic inside the pipe (escape hatch for app-specific steps). */
export const exec = (fn: (ctx: E2EContext) => Promise<void> | void): E2EAction => act('exec', async (ctx) => fn(ctx));

/** Capture a value into shared state for later steps (e.g. an id parsed from the URL). */
export const set = <T>(key: string, fn: (ctx: E2EContext) => Promise<T> | T): E2EAction =>
  act('set', async (ctx) => {
    ctx.state[key] = await fn(ctx);
  });
