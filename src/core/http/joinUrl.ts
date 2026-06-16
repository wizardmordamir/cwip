/**
 * Join URL segments with exactly one slash between each — the "URL ≠ node:path"
 * gap that gets reinvented in every app (collapsing `//`, but never the `://` in
 * a protocol). Leading/trailing slashes on the inputs are normalized; a trailing
 * slash on the final segment is preserved.
 *
 *   joinUrl('https://api.example.com/', '/v1/', '/users')  // 'https://api.example.com/v1/users'
 *   joinUrl('https://api.example.com', 'v1', 'users/')     // 'https://api.example.com/v1/users/'
 *   joinUrl('/api', 'health')                              // '/api/health'
 *
 * Empty/nullish segments are skipped, so `joinUrl(base, maybePath)` is safe when
 * `maybePath` is `''` or `undefined`.
 */
export const joinUrl = (...segments: (string | null | undefined)[]): string => {
  const parts = segments.filter((s): s is string => Boolean(s));
  if (parts.length === 0) {
    return '';
  }

  const trailingSlash = /\/$/.test(parts[parts.length - 1]);

  const joined = parts
    .map((part, i) => {
      let p = part;
      // Keep a leading slash (or protocol) on the first segment; strip it elsewhere.
      if (i > 0) {
        p = p.replace(/^\/+/, '');
      }
      return p.replace(/\/+$/, '');
    })
    .filter((p, i) => p !== '' || i === 0)
    // Collapse any internal `//` runs except the `://` in a protocol.
    .join('/')
    .replace(/([^:])\/{2,}/g, '$1/');

  return trailingSlash && !/\/$/.test(joined) ? `${joined}/` : joined;
};
