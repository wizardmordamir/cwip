import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface JsonConfigOptions<T> {
  /** Defaults shallow-merged *under* the file's values (file wins). Also written when creating. */
  defaults?: Partial<T>;
  /** Create the file (with `defaults`) when it doesn't exist, instead of using defaults in-memory only. */
  createIfMissing?: boolean;
  /** Validate/normalize the raw parsed JSON before it's merged and cached. */
  parse?: (raw: unknown) => Partial<T>;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  value: unknown;
}

// Parsed config reused across calls, re-read only when the file changes (keyed on
// mtime+size) — so repeated loads in one request don't re-read + re-parse.
const cache = new Map<string, CacheEntry>();

/** Drop the in-process config cache for one path, or all paths when omitted. */
export const clearJsonConfigCache = (path?: string): void => {
  if (path) {
    cache.delete(resolve(path));
  } else {
    cache.clear();
  }
};

/**
 * Load (and optionally create) a JSON config file with an mtime+size cache, so
 * repeated calls don't re-read or re-parse until the file actually changes — a
 * hand/CLI edit changes the mtime and is picked up automatically. `defaults` are
 * shallow-merged under the file's values; pass `parse` to validate/normalize.
 * The JSON-only generalization of an app's per-machine config loader (YAML, which
 * needs a dependency, would belong in a peer-dep subpath).
 *
 *   const cfg = await loadJsonConfig<AppConfig>('~/.app/config.json', {
 *     defaults: { port: 3000 }, createIfMissing: true,
 *   });
 */
export const loadJsonConfig = async <T extends Record<string, unknown>>(
  path: string,
  options: JsonConfigOptions<T> = {},
): Promise<T> => {
  const file = resolve(path);
  const { defaults = {}, parse } = options;

  let st: { mtimeMs: number; size: number } | null = null;
  try {
    st = await stat(file);
  } catch {
    st = null;
  }

  if (st) {
    const cached = cache.get(file);
    if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
      return { ...(cached.value as T) };
    }
    const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
    const parsed = parse ? parse(raw) : (raw as Partial<T>);
    const value = { ...defaults, ...parsed } as T;
    cache.set(file, { mtimeMs: st.mtimeMs, size: st.size, value });
    return { ...value };
  }

  // No file. Create it from defaults when asked; otherwise return defaults in-memory.
  const value = { ...defaults } as T;
  if (options.createIfMissing) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
    clearJsonConfigCache(file);
  }
  return { ...value };
};

/** Write `value` to a JSON config file (pretty-printed) and invalidate its cache. */
export const saveJsonConfig = async (path: string, value: unknown): Promise<void> => {
  const file = resolve(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  clearJsonConfigCache(file);
};
