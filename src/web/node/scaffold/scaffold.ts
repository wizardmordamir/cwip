import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { applyManagedBlock } from './managedBlock';
import { mergeManagedKeys } from './mergeManagedKeys';
import { FILE_TEMPLATES, PACKAGE_SCRIPTS, type ScaffoldOptions } from './templates';

export interface ScaffoldChange {
  file: string;
  action: 'created' | 'skipped' | 'updated';
  detail?: string;
}

const exists = async (p: string): Promise<boolean> => {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
};

const writeFileEnsuringDir = async (p: string, content: string): Promise<void> => {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, content);
};

/** Merge the canonical scripts into a package.json at `dir`, preserving app
 *  scripts. Returns the changed script names. Creates a minimal package.json if
 *  none exists. */
const mergePackageScripts = async (dir: string, name?: string): Promise<string[]> => {
  const pkgPath = join(dir, 'package.json');
  const pkg = (await exists(pkgPath))
    ? JSON.parse(await readFile(pkgPath, 'utf8'))
    : { name: name ?? 'app', private: true };
  const { merged, changed } = mergeManagedKeys(pkg.scripts, PACKAGE_SCRIPTS);
  if (changed.length) {
    pkg.scripts = merged;
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return changed;
};

/**
 * Scaffold the canonical config into a (new) app directory. Writes each template
 * file if absent (or always when `force`), and merges the canonical package.json
 * scripts. Never clobbers an existing file unless `force` — so it's safe to run in
 * a partially-set-up app. Returns a per-file change list.
 */
export const scaffoldProject = async (
  dir: string,
  options: ScaffoldOptions & { force?: boolean } = {},
): Promise<ScaffoldChange[]> => {
  const changes: ScaffoldChange[] = [];
  for (const [rel, content] of Object.entries(FILE_TEMPLATES)) {
    const target = join(dir, rel);
    if (!options.force && (await exists(target))) {
      changes.push({ file: rel, action: 'skipped', detail: 'already exists' });
      continue;
    }
    await writeFileEnsuringDir(target, content);
    changes.push({ file: rel, action: 'created' });
  }
  const changedScripts = await mergePackageScripts(dir, options.name);
  changes.push({
    file: 'package.json',
    action: changedScripts.length ? 'updated' : 'skipped',
    detail: changedScripts.length ? `scripts: ${changedScripts.join(', ')}` : 'scripts already current',
  });
  return changes;
};

/**
 * Sync the *managed* parts of an existing app's config: re-merge the canonical
 * package.json scripts (preserving app-specific ones) and refresh any cwip-managed
 * blocks inside vite.config.ts. Leaves everything else alone. Returns the changes.
 */
export const syncProject = async (dir: string): Promise<ScaffoldChange[]> => {
  const changes: ScaffoldChange[] = [];

  const changedScripts = await mergePackageScripts(dir);
  changes.push({
    file: 'package.json',
    action: changedScripts.length ? 'updated' : 'skipped',
    detail: changedScripts.length ? `scripts: ${changedScripts.join(', ')}` : 'scripts already current',
  });

  // Refresh the React-dedupe managed block in vite.config.ts if the file is there.
  const vitePath = join(dir, 'vite.config.ts');
  if (await exists(vitePath)) {
    const current = await readFile(vitePath, 'utf8');
    const body = [
      '// Force a single React instance. cwip is bun-linked and ships its own React, so',
      '// without deduping Vite bundles a SECOND React for cwip/react and the app white-screens.',
      "const cwipReactDedupe = ['react', 'react-dom', 'react/jsx-runtime', 'react/compiler-runtime'];",
    ].join('\n');
    const next = applyManagedBlock(current, 'vite-react', body);
    if (next !== current) {
      await writeFile(vitePath, next);
      changes.push({ file: 'vite.config.ts', action: 'updated', detail: 'refreshed cwip:vite-react block' });
    } else {
      changes.push({ file: 'vite.config.ts', action: 'skipped', detail: 'block already current' });
    }
  }

  return changes;
};
