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

/** A Tailwind v4 entry that scans cwip/react's shipped classes. */
export const STYLES_CSS = `@import 'tailwindcss';

/* cwip/react ships Tailwind-first components (InfoHint, Toast, the design-system
   kit). v4 skips node_modules, so opt its built classes back in explicitly. */
@source '../node_modules/cwip/dist/web/react';
`;

/**
 * Thin wrapper over cwip's incremental build cache. Apps own the config (ignore
 * lists, extra input dirs) here and the WHEN in their package.json; cwip owns the
 * hashing. See `cwip/build`.
 */
export const SCRIPT_BUILD_CACHE_TS = `#!/usr/bin/env bun
// Incremental build cache: skips a build/lint when its inputs are unchanged.
// Usage: buildCache <check|save|clean> [dir]
//   check <dir>  exit 0 = unchanged (skip), exit 1 = changed (build needed)
//   save  <dir>  record the manifest after a successful build
//   clean [dir]  drop one target's manifest, or the whole cache
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
