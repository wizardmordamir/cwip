#!/usr/bin/env node
// The `cwip` CLI. Bootstraps a new app's config (`cwip scaffold`) or refreshes the
// standardized parts of an existing one (`cwip sync`). See web/node/scaffold.
import { resolve } from 'node:path';
import { scaffoldProject, syncProject } from '../web/node/scaffold';

const USAGE = `cwip — project config scaffolder

Usage:
  cwip scaffold [dir]   Write canonical config (biome/tsconfig/vite/bunfig + scripts)
                        into an app. Skips files that already exist.
  cwip sync [dir]       Re-merge the canonical package.json scripts and refresh
                        cwip-managed config blocks (e.g. the React dedupe).

Options:
  --force               (scaffold) overwrite existing files
  --name <name>         (scaffold) package name when creating package.json
  -h, --help            show this help
`;

const main = async (argv: string[]): Promise<number> => {
  const args = argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    process.stdout.write(USAGE);
    return args.length ? 0 : 1;
  }

  const command = args[0];
  const positional = args.slice(1).filter((a) => !a.startsWith('-'));
  const dir = resolve(positional[0] ?? '.');
  const force = args.includes('--force');
  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1] : undefined;

  if (command === 'scaffold') {
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
