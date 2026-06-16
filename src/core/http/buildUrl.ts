import { joinUrl } from './joinUrl';

/** Query params appended to a URL; `null`/`undefined` values are skipped. */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Resolve a request `path` against a `baseUrl` and append query params. An
 * absolute path (`http://`/`https://`) is used as-is; otherwise it's joined to
 * the base with a single slash. Array-free, dependency-free.
 *
 *   buildUrl('https://api.example.com', '/users', { page: 2, q: 'a b' })
 *   // 'https://api.example.com/users?page=2&q=a+b'
 *   buildUrl('https://api.example.com', 'https://other.com/x') // 'https://other.com/x'
 */
export const buildUrl = (baseUrl: string, path: string, query?: QueryParams): string => {
  const base = /^https?:\/\//i.test(path) ? path : joinUrl(baseUrl, path);
  if (!query) {
    return base;
  }

  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
};
