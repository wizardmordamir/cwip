import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Post-build pass: tsc only emits .js / .d.ts, so any hand-authored non-TS asset
 * that ships in the package (e.g. cwip/react's default `theme.css`) has to be
 * copied into `dist` by hand. Add a `[src, dist]` pair here for each one.
 */
const ASSETS: [from: string, to: string][] = [
  ['src/web/react/theme.css', 'dist/web/react/theme.css'],
  // cwip/styles.css — Tailwind v4 source registration. Its `@source "."` is
  // relative to the shipped dist root, so it must land at `dist/styles.css`.
  ['src/styles.css', 'dist/styles.css'],
];

let copied = 0;
for (const [from, to] of ASSETS) {
  const src = resolve(from);
  const dest = resolve(to);
  if (!existsSync(src)) throw new Error(`copyStaticAssets: missing source asset ${from}`);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  copied++;
}

console.log(`✅ copied ${copied} static asset(s) into dist`);
