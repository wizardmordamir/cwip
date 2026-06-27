// Canonical config templates the scaffold/sync commands write into an app. The
// house style mirrors cwip's own: 2-space indent, single quotes, 120 columns,
// semicolons, trailing commas, organize-imports. New apps start consistent; the
// JSON configs are full files, the package.json scripts are a managed key-merge.

export interface ScaffoldOptions {
  /** App name (used in package.json if one is created). */
  name?: string;
  /** Include the React/Vite-flavoured vite.config + dedupe (default true). */
  react?: boolean;
}

/** The canonical Biome config (the cwip house style). */
export const BIOME_JSON = `{
  "$schema": "https://biomejs.dev/schemas/2.4.16/schema.json",
  "files": { "includes": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "off", "noImplicitAnyLet": "off" },
      "style": { "noNonNullAssertion": "off" }
    }
  },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" } },
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }
}
`;

/** A sensible base tsconfig for a bundler-resolved React/TS app. */
export const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["bun"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.ignore.*"]
}
`;

/** Bun test isolation preload (matches cwip's own convention). */
export const BUNFIG_TOML = `[test]
preload = ["./scripts/testSetup.ts"]
coverage = false
`;

/**
 * A Vite config for a React + Tailwind app. The `resolve.dedupe` is load-bearing:
 * a bun-linked cwip ships its own React, so without deduping the bundle gets two
 * Reacts and hooks read a null dispatcher → white screen. Always keep it.
 */
export const VITE_CONFIG_TS = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// >>> cwip:vite-react — managed block; edits between the markers are overwritten by \`cwip sync\`
// Force a single React instance. cwip is bun-linked and ships its own React, so
// without deduping Vite bundles a SECOND React for cwip/react's components/hooks —
// two Reacts means hooks read a null dispatcher and the app white-screens.
const cwipReactDedupe = ['react', 'react-dom', 'react/jsx-runtime', 'react/compiler-runtime'];
// <<< cwip:vite-react

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: cwipReactDedupe },
});
`;

/** A Tailwind v4 entry that scans cursedbelt's shipped classes. */
export const STYLES_CSS = `@import 'tailwindcss';

/* cursedbelt ships Tailwind-first components (the design-system kit). v4 skips
   node_modules, so opt its built classes back in explicitly. */
@source '../node_modules/cursedbelt/dist';
`;

/**
 * Thin wrapper over cwip's incremental build cache. Apps own the config (ignore
 * lists, extra input dirs) here and the WHEN in their package.json; cwip owns the
 * hashing. See `cwip/build`.
 */
export const SCRIPT_BUILD_CACHE_TS = `#!/usr/bin/env bun
// Incremental build cache: skips a build/lint when its inputs are unchanged.
// Usage: buildCache <check|save|clean> [dir] [--force]
//   check <dir>  exit 0 = unchanged (skip), exit 1 = changed (build needed)
//   save  <dir>  record the manifest after a successful build
//   clean [dir]  drop one target's manifest, or the whole cache
// Force a real rebuild (never trust a cached green): pass --force/--no-cache, or
// set CWIP_BUILD_NO_CACHE=1 to bypass the cache for a whole process — do this at
// any green gate and across every merge/promotion boundary, so a stale-cache
// skip can't certify broken output as green. Inner-loop builds stay cached.
import { runBuildCacheCli } from 'cwip/build';

// Add app-specific config here, e.g. { extraDirs: ['shared'] } for a symlinked
// shared dir, or { rootInputs: [...DEFAULT_ROOT_INPUTS, 'tsconfig.base.json'] }.
process.exit(await runBuildCacheCli());
`;

/** Thin wrapper over cwip's `runWithTimeout` so a hung step can't wedge a build/clean. */
export const SCRIPT_WITH_TIMEOUT_TS = `#!/usr/bin/env bun
// Run a command with a timeout, killing it if it hangs.
// Usage: withTimeout [ms] <command...>   e.g. withTimeout 3000 rm -rf dist
import { runWithTimeoutCli } from 'cwip/node';

process.exit(await runWithTimeoutCli());
`;

/** The canonical package.json scripts (managed-merged, not clobbering app extras). */
export const PACKAGE_SCRIPTS: Record<string, string> = {
  dev: 'vite',
  build: 'bun scripts/buildCache check . || (vite build && bun scripts/buildCache save .)',
  clean: 'bun scripts/withTimeout 3000 rm -rf dist',
  // Bust the build cache so the next build is forced — run it across merge /
  // promotion boundaries (a cached green must never survive a merge).
  'remove:hashes': 'bun scripts/buildCache clean',
  tsc: 'tsc --noEmit',
  check: 'biome check ./src && bun run tsc',
  fix: 'biome check --write --unsafe ./src',
  format: 'biome format --write ./src',
  test: 'bun test',
  done: 'bun run check && bun run test && bun run build',
};

/** Files the scaffold writes verbatim (skipped if present unless `--force`). */
export const FILE_TEMPLATES: Record<string, string> = {
  'biome.json': BIOME_JSON,
  'tsconfig.json': TSCONFIG_JSON,
  'bunfig.toml': BUNFIG_TOML,
  'vite.config.ts': VITE_CONFIG_TS,
  'src/styles.css': STYLES_CSS,
  'scripts/buildCache.ts': SCRIPT_BUILD_CACHE_TS,
  'scripts/withTimeout.ts': SCRIPT_WITH_TIMEOUT_TS,
};

// ---------------------------------------------------------------------------
// rubato-app template  (`cwip scaffold --template rubato-app`)
// ---------------------------------------------------------------------------
// Generates the minimal skeleton for a standalone "friend" mini-app that
// assembles rubato plugins at build time. Models on playwright-tool/ (Stage 5).
// Files: server.ts, root package.json, .gitignore, ui/index.html, ui/tsconfig.json,
//        ui/vite.config.ts, ui/package.json, ui/src/main.tsx, ui/src/App.tsx,
//        ui/src/styles.css.

const RUBATO_APP_SERVER_TS = (name: string) => `\
// ${name} — server entry. Import the rubato plugins you need, then start the app.
//
// Run:
//   bun run build  → builds ui/dist
//   bun run serve  → boots this file on PORT (default 5000)
//   bun run start  → build + serve in one step
//
// TODO: import your plugin(s) from rubato, e.g.:
//   import { automationsPlugin } from 'rubato/plugins/automations';
import { startApp } from 'rubato/server';

const handle = startApp({
  plugins: [
    // TODO: add rubato plugins here, e.g. automationsPlugin(),
  ],
  port: Number(process.env.PORT) || 5000,
  uiDist: new URL('./ui/dist', import.meta.url).pathname,
});

console.log(\`${name} listening on \${handle.url}\`);
`;

const RUBATO_APP_ROOT_PACKAGE_JSON = (name: string) => `\
{
  "name": "${name}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "cd ui && bun run dev",
    "build": "cd ui && bun run build",
    "serve": "bun run server.ts",
    "start": "bun run build && bun run serve"
  },
  "dependencies": {
    "cwip": "link:cwip",
    "rubato": "link:rubato"
  },
  "devDependencies": {
    "@types/bun": "^1.3.13"
  }
}
`;

const RUBATO_APP_GITIGNORE = `\
node_modules/
ui/node_modules/
ui/dist/
*.log
.DS_Store
`;

const RUBATO_APP_UI_INDEX_HTML = (name: string) => `\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const RUBATO_APP_UI_TSCONFIG_JSON = `\
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"],
    "paths": {
      "@shared/*": ["./node_modules/rubato/src/shared/*"]
    }
  },
  "include": ["src"]
}
`;

// NOTE: rubato UI externals are broader than plain-cwip apps — cwip + rubato +
// react-router-dom + @tanstack/react-query are all peer deps bundled by this app.
// The @shared alias points at app's shipped src/shared (for type compatibility).
const RUBATO_APP_UI_VITE_CONFIG_TS = `\
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

// The dedupe list below is load-bearing. app's embeddable UI externalises react,
// react-dom, react-router-dom, @tanstack/react-query, and cwip — so this app bundles
// them all. cwip is bun-linked and ships its OWN copies of React + react-query under
// its node_modules; without forcing single instances Vite bundles a second React
// (null hook dispatcher → white screen) and a second QueryClient (hooks can't see
// the provider). The @shared alias matches app's own Vite alias so that types from
// rubato/ui/* resolve correctly.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': resolve(here, 'node_modules/rubato/src/shared') },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', '@tanstack/react-query'],
  },
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
`;

const RUBATO_APP_UI_PACKAGE_JSON = (name: string) => `\
{
  "name": "${name}-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --bun vite",
    "build": "bun --bun vite build",
    "preview": "bun --bun vite preview",
    "tsc": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.7",
    "cwip": "link:../cwip",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1",
    "rubato": "link:../rubato"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^8.0.16"
  }
}
`;

const RUBATO_APP_UI_MAIN_TSX = `\
import { initUiScale } from 'cwip/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from 'rubato/ui/shell';
import { App } from './App';
import './styles.css';

// Apply the saved app-wide UI scale before React mounts (prevents a flash).
initUiScale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
`;

const RUBATO_APP_UI_APP_TSX = `\
// The app's routes. Import page components from rubato plugin UI subpaths, e.g.:
//   import { AutomationsPage, BuilderPage } from 'rubato/ui/automations';
// AppShell supplies the nav + chrome. AppProviders (in main.tsx) wires context.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from 'rubato/ui/shell';

// TODO: pick your brand accent color (any CSS color).
const ACCENT = '#7c3aed'; // violet-600; adjust the .dark variant in styles.css too
const LABEL = 'my-app'; // Brand label shown in mobile header; defaults to "rubato"

export function App() {
  return (
    <BrowserRouter>
      <AppShell accent={ACCENT} label={LABEL}>
        <Routes>
          {/* TODO: add your page routes here, e.g.:
              <Route path="/automations" element={<AutomationsPage />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
`;

const RUBATO_APP_UI_STYLES_CSS = `\
@import 'tailwindcss';
/* Generate Tailwind classes shipped by cwip/react and app's embeddable UI.
   Tailwind v4 skips node_modules, so each package opts its dist in explicitly. */
@import 'cwip/styles.css';
@import 'rubato/styles.css';

/* TODO: adjust your brand accent color here and in App.tsx.
   Every cwip/react + rubato \`*-accent\` utility re-themes off these tokens. */
:root {
  --accent: #7c3aed; /* violet-600 */
  --accent-hover: #6d28d9; /* violet-700 */
  --accent-soft: #f5f3ff; /* violet-50 */
}
.dark {
  --accent: #a78bfa; /* violet-400 */
  --accent-hover: #c4b5fd; /* violet-300 */
  --accent-soft: #2e1065; /* violet-950 */
}
@theme inline {
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
}
`;

/**
 * Generate the file map for a rubato-app scaffold. Call with the app name
 * (e.g. 'my-tool'); files containing the name are rendered with it interpolated.
 */
export const rubatoAppTemplates = (name: string): Record<string, string> => ({
  'server.ts': RUBATO_APP_SERVER_TS(name),
  'package.json': RUBATO_APP_ROOT_PACKAGE_JSON(name),
  '.gitignore': RUBATO_APP_GITIGNORE,
  'ui/index.html': RUBATO_APP_UI_INDEX_HTML(name),
  'ui/tsconfig.json': RUBATO_APP_UI_TSCONFIG_JSON,
  'ui/vite.config.ts': RUBATO_APP_UI_VITE_CONFIG_TS,
  'ui/package.json': RUBATO_APP_UI_PACKAGE_JSON(name),
  'ui/src/main.tsx': RUBATO_APP_UI_MAIN_TSX,
  'ui/src/App.tsx': RUBATO_APP_UI_APP_TSX,
  'ui/src/styles.css': RUBATO_APP_UI_STYLES_CSS,
});
