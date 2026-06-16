// A "managed block" is a region of a text config file (e.g. vite.config.ts,
// bunfig.toml) delimited by comment markers, so `cwip sync` can refresh just that
// region without clobbering an app's own additions around it.

export interface ManagedBlockMarkers {
  begin: string;
  end: string;
}

/** Build the begin/end marker comments for a managed block. `comment` is the
 *  file's line-comment token (`//` for TS, `#` for TOML). */
export const managedMarkers = (id: string, comment = '//'): ManagedBlockMarkers => ({
  begin: `${comment} >>> cwip:${id} — managed block; edits between the markers are overwritten by \`cwip sync\``,
  end: `${comment} <<< cwip:${id}`,
});

/** Whether `content` already contains the managed block `id`. */
export const hasManagedBlock = (content: string, id: string, comment = '//'): boolean => {
  const { begin, end } = managedMarkers(id, comment);
  return content.includes(begin) && content.includes(end);
};

/**
 * Insert or replace a managed block in `content`. If the block exists (matched by
 * its markers) its body is replaced; otherwise the block is appended. The returned
 * string always contains exactly one copy of the block. Pure — no I/O.
 */
export const applyManagedBlock = (content: string, id: string, body: string, comment = '//'): string => {
  const { begin, end } = managedMarkers(id, comment);
  const block = `${begin}\n${body}\n${end}`;
  if (hasManagedBlock(content, id, comment)) {
    // Replace everything between (and including) the markers.
    const startIdx = content.indexOf(begin);
    const endIdx = content.indexOf(end, startIdx) + end.length;
    return content.slice(0, startIdx) + block + content.slice(endIdx);
  }
  const trimmed = content.replace(/\s*$/, '');
  return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`;
};

/** Extract a managed block's body, or `undefined` if absent. */
export const extractManagedBlock = (content: string, id: string, comment = '//'): string | undefined => {
  const { begin, end } = managedMarkers(id, comment);
  const startIdx = content.indexOf(begin);
  if (startIdx < 0) return undefined;
  const bodyStart = startIdx + begin.length + 1; // skip the trailing newline
  const endIdx = content.indexOf(end, bodyStart);
  if (endIdx < 0) return undefined;
  return content.slice(bodyStart, endIdx).replace(/\n$/, '');
};
