/**
 * A cookie-jar `fetch`: a stateful wrapper that carries cookies across requests
 * within one session — it reads `Set-Cookie` off each response into an in-memory
 * jar and sends the jar as the `Cookie` header on subsequent calls. This is the
 * piece that multi-step, cookie-based login flows (submit credentials → follow
 * the session → exchange for a token) reinvent every time; the vendor-specific
 * step shapes stay in the caller, the cookie plumbing lives here.
 *
 *   const sf = createSessionFetch();
 *   await sf('https://idp/authenticate', { method: 'POST', body });
 *   const me = await sf('https://idp/api/session'); // sends the cookies set above
 *
 * `fetch` is injectable for tests. Reading `Set-Cookie` requires a runtime that
 * exposes it on responses (Node/Bun/undici — `Headers.getSetCookie()`); browsers
 * forbid it, so this is a server-side primitive. Dependency-free.
 */

export interface SessionFetch {
  (input: string, init?: RequestInit): Promise<Response>;
  /** Current jar as a `name=value; …` Cookie header string (`''` when empty). */
  cookieHeader(): string;
  /** Snapshot of the jar (name → value). */
  cookies(): Record<string, string>;
  /** Drop all stored cookies. */
  clear(): void;
}

export interface SessionFetchOptions {
  /** Injectable fetch (defaults to the global). */
  fetch?: typeof fetch;
  /** Seed the jar (e.g. a pre-existing session cookie). */
  initialCookies?: Record<string, string>;
}

/** Pull the raw `Set-Cookie` values off a response, across runtimes. */
const setCookiesOf = (res: Response): string[] => {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
};

// Parse one Set-Cookie line into [name, value], taking the part before the first
// attribute (`;`). Returns null for an unparseable / deletion-less blank.
const parseSetCookie = (line: string): [string, string] | null => {
  const pair = line.split(';', 1)[0]?.trim();
  if (!pair) {
    return null;
  }
  const eq = pair.indexOf('=');
  if (eq <= 0) {
    return null;
  }
  return [pair.slice(0, eq).trim(), pair.slice(eq + 1).trim()];
};

export const createSessionFetch = (options: SessionFetchOptions = {}): SessionFetch => {
  const doFetch = options.fetch ?? fetch;
  const jar = new Map<string, string>(Object.entries(options.initialCookies ?? {}));

  const cookieHeader = () => [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');

  const sessionFetch = (async (input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const cookie = cookieHeader();
    if (cookie && !headers.has('cookie')) {
      headers.set('cookie', cookie);
    }
    const res = await doFetch(input, { ...init, headers });
    for (const line of setCookiesOf(res)) {
      const parsed = parseSetCookie(line);
      if (parsed) {
        jar.set(parsed[0], parsed[1]);
      }
    }
    return res;
  }) as SessionFetch;

  sessionFetch.cookieHeader = cookieHeader;
  sessionFetch.cookies = () => Object.fromEntries(jar);
  sessionFetch.clear = () => jar.clear();
  return sessionFetch;
};
