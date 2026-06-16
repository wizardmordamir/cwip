/**
 * Merge a set of canonical key→value pairs into a JSON-derived object (e.g. the
 * `scripts` map in package.json), overwriting only the managed keys and leaving
 * every other key untouched. Pure — operates on plain objects.
 *
 * Returns the merged object plus the list of keys that actually changed, so a
 * `sync` command can report what it did.
 */
export interface MergeResult<T> {
  merged: Record<string, T>;
  changed: string[];
}

export const mergeManagedKeys = <T>(
  existing: Record<string, T> | undefined,
  managed: Record<string, T>,
): MergeResult<T> => {
  const base = existing ?? {};
  const merged: Record<string, T> = { ...base };
  const changed: string[] = [];
  for (const [key, value] of Object.entries(managed)) {
    if (base[key] !== value) changed.push(key);
    merged[key] = value;
  }
  return { merged, changed };
};
