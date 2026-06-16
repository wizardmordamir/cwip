/**
 * Decode (NOT verify) a JWT, returning its header and claims. This is a pure,
 * dependency-free base64url decode — it does **no signature verification**, so
 * never trust the result for authorization; use it for reading non-sensitive
 * claims client-side (expiry, subject, display fields). Verification needs a
 * crypto library and belongs on the server.
 */
export interface DecodedJwt<TClaims = Record<string, unknown>> {
  header: Record<string, unknown>;
  payload: TClaims;
  signature: string;
}

/** Base64url-decode a string to UTF-8 (browser-safe: `atob` + `TextDecoder`). */
const base64UrlDecode = (segment: string): string => {
  const padded = segment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * Decode a JWT string into `{ header, payload, signature }`, or return `null` if
 * it isn't a well-formed three-part token with JSON header/payload.
 *
 *   decodeJwt(token)?.payload.sub
 */
export const decodeJwt = <TClaims = Record<string, unknown>>(token: string): DecodedJwt<TClaims> | null => {
  if (typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])) as TClaims,
      signature: parts[2],
    };
  } catch {
    return null;
  }
};

/**
 * Whether a JWT is expired (or expires within `leewaySeconds`, default 0), read
 * from the standard `exp` claim (seconds since epoch). Returns `true` for a token
 * that can't be decoded or has no numeric `exp` — i.e. "don't trust it".
 *
 *   if (isJwtExpired(token, 30)) await refresh(); // refresh 30s early
 */
export const isJwtExpired = (token: string, leewaySeconds = 0): boolean => {
  const exp = decodeJwt(token)?.payload as { exp?: unknown } | undefined;
  if (!exp || typeof exp.exp !== 'number') {
    return true;
  }
  return Date.now() >= (exp.exp - leewaySeconds) * 1000;
};

/**
 * Extract a bearer token from an `Authorization` header value (case-insensitive
 * scheme, tolerant of extra whitespace). Returns `null` when absent or not a
 * bearer scheme.
 *
 *   extractBearerToken('Bearer abc.def.ghi') // 'abc.def.ghi'
 */
export const extractBearerToken = (authorization: string | null | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const match = authorization.match(/^\s*Bearer\s+(.+?)\s*$/i);
  return match ? match[1] : null;
};
