import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Post-build pass: tsc (moduleResolution: bundler) emits extensionless relative
 * specifiers like `export * from './array'`. Bundlers tolerate that, but native
 * Node ESM does not — it requires `./array/index.js`. This rewrites every
 * relative specifier in the emitted .js / .d.ts to include the explicit
 * extension, so the published package imports cleanly under plain `node` too,
 * while the source stays extensionless for nicer DX.
 */

const DIST = resolve('dist');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.js') || full.endsWith('.d.ts')) out.push(full);
  }
  return out;
};

const rewriteSpecifier = (fromFile: string, spec: string): string => {
  if (!spec.startsWith('.')) return spec; // bare imports / node: / bun: — leave alone
  if (/\.(js|json|mjs|cjs)$/.test(spec)) return spec; // already explicit
  const base = resolve(dirname(fromFile), spec);
  // .d.ts files reference siblings by their .js name (TS maps .js -> .d.ts).
  if (existsSync(`${base}.js`)) return `${spec}.js`;
  if (existsSync(join(base, 'index.js'))) return `${spec}/index.js`;
  return spec;
};

// Matches: `from './x'`, `import './x'`, dynamic `import('./x')`, and bare
// directory imports `from '.'` / `from '..'` (the `*` allows the lone-dot cases,
// which native Node ESM rejects as directory imports and must become `./index.js`).
const SPEC_RE = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.[^'"]*)\2/g;

let changed = 0;
for (const file of walk(DIST)) {
  const source = readFileSync(file, 'utf8');
  const out = source.replace(SPEC_RE, (match, pre: string, quote: string, spec: string) => {
    const next = rewriteSpecifier(file, spec);
    return next === spec ? match : `${pre}${quote}${next}${quote}`;
  });
  if (out !== source) {
    writeFileSync(file, out);
    changed++;
  }
}

console.log(`✅ ESM extensions normalized in ${changed} file(s)`);
