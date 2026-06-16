import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestArtifact, TestArtifactKind } from '../test-report/types';
import type { E2EContext } from './types';

const slug = (s: string): string => s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';

/**
 * Send one artifact to the run. With a Playwright `testInfo` attached, use the
 * native attachment pipeline (the reporter converts those to artifacts); otherwise
 * write to the capture dir (or keep small text inline) and push onto the recorder.
 */
export const emitArtifact = async (
  ctx: E2EContext,
  kind: TestArtifactKind,
  name: string,
  body: Buffer | string,
  mime: string,
): Promise<void> => {
  if (ctx.testInfo) {
    await ctx.testInfo.attach(name, { body, contentType: mime });
    return;
  }
  const art: TestArtifact = { kind, name, mime };
  const dir = ctx.config.capture.dir;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${Date.now()}-${slug(name)}`);
    writeFileSync(file, body);
    art.path = file;
    art.bytes = typeof body === 'string' ? Buffer.byteLength(body) : body.length;
  } else if (typeof body === 'string') {
    art.inline = body;
  }
  ctx.recorder.pushArtifact(art);
};

/**
 * Capture the page's current state — screenshot, HTML, buffered console + network —
 * per the config's capture flags. Called automatically by `act` on failure (and
 * per-step when enabled). Never throws: a capture problem must not mask the real
 * test failure.
 */
export const captureArtifacts = async (ctx: E2EContext, label: string, _opts: { failure: boolean }): Promise<void> => {
  const { page, config } = ctx;
  const c = config.capture;
  const base = slug(label);
  try {
    if (c.screenshots) {
      const buf = await page.screenshot({ fullPage: true }).catch(() => null);
      if (buf) await emitArtifact(ctx, 'screenshot', `${base}.png`, buf, 'image/png');
    }
    if (c.html) {
      const html = await page.content().catch(() => null);
      if (html) await emitArtifact(ctx, 'html', `${base}.html`, html, 'text/html');
    }
    if (c.console) {
      const lines = ctx.recorder.consoleLines();
      if (lines.length) await emitArtifact(ctx, 'log', `${base}.console.log`, lines.join('\n'), 'text/plain');
    }
    if (c.network) {
      const net = ctx.recorder.networkEntries();
      if (net.length)
        await emitArtifact(ctx, 'network', `${base}.network.json`, JSON.stringify(net, null, 2), 'application/json');
    }
  } catch {
    // capture is best-effort; swallow so the original failure surfaces
  }
};
