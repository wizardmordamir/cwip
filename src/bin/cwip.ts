#!/usr/bin/env node
// The `cwip` CLI. Bootstraps a new app's config (`cwip scaffold`) or refreshes the
// standardized parts of an existing one (`cwip sync`). See web/node/scaffold.
import { resolve } from 'node:path';
import { scaffoldProject, scaffoldRubatoApp, syncProject } from '../web/node/scaffold';

const USAGE = `cwip — project config scaffolder

Usage:
  cwip scaffold [dir]                        Write canonical config (biome/tsconfig/vite/bunfig
                                             + scripts) into an app. Skips existing files.
  cwip scaffold --template rubato-app [dir]  Bootstrap a standalone rubato friend-app skeleton
                                             (server.ts + ui/ with AppShell, routes, theming).
  cwip sync [dir]                            Re-merge the canonical package.json scripts and
                                             refresh cwip-managed config blocks.

Options:
  --template <name>     (scaffold) which template to use (default: cwip; available: rubato-app)
  --force               (scaffold) overwrite existing files
  --name <name>         (scaffold) app name for package.json / index.html
  -h, --help            show this help
`;

const RUBATO_APP_NEXT_STEPS = `
Next steps:
  1. Run \`bun link cwip\` and \`bun link rubato\` in their respective repos (if not done).
  2. Run \`bun install\` in this dir, then \`cd ui && bun install\`.
  3. Open server.ts and ui/src/App.tsx — follow the TODO comments to add your plugins.
  4. Run \`bun run build && bun run serve\` to boot the app on http://localhost:5000.
`;

const main = async (argv: string[]): Promise<number> => {
  const args = argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    process.stdout.write(USAGE);
    return args.length ? 0 : 1;
  }

  const command = args[0];
  const force = args.includes('--force');
  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
  const templateIdx = args.indexOf('--template');
  const template = templateIdx >= 0 ? args[templateIdx + 1] : undefined;
  // Skip flags and their values; the remaining non-flag args are positional.
  const flagValues = new Set<string>();
  if (name !== undefined) flagValues.add(name);
  if (template !== undefined) flagValues.add(template);
  const positional = args.slice(1).filter((a) => !a.startsWith('-') && !flagValues.has(a));
  const dir = resolve(positional[0] ?? '.');

  if (command === 'scaffold') {
    if (template === 'rubato-app') {
      const changes = await scaffoldRubatoApp(dir, { force, name });
      for (const c of changes)
        process.stdout.write(`  ${c.action.padEnd(8)} ${c.file}${c.detail ? ` (${c.detail})` : ''}\n`);
      process.stdout.write(RUBATO_APP_NEXT_STEPS);
      return 0;
    }
    if (template !== undefined) {
      process.stderr.write(`Unknown template: ${template}\nAvailable templates: rubato-app\n`);
      return 1;
    }
    const changes = await scaffoldProject(dir, { force, name });
    for (const c of changes)
      process.stdout.write(`  ${c.action.padEnd(8)} ${c.file}${c.detail ? ` (${c.detail})` : ''}\n`);
    process.stdout.write(
      '\nNext: install deps, then add `@source "../node_modules/cwip/dist/web/react"` to your Tailwind entry.\n',
    );
    return 0;
  }

  if (command === 'sync') {
    const changes = await syncProject(dir);
    for (const c of changes)
      process.stdout.write(`  ${c.action.padEnd(8)} ${c.file}${c.detail ? ` (${c.detail})` : ''}\n`);
    return 0;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
  return 1;
};

main(process.argv).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`cwip: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  },
);
