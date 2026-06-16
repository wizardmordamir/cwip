import { describe, expect, it } from 'bun:test';
import { decodeJwt, extractBearerToken, isJwtExpired } from '.';

const b64url = (obj: unknown) => {
  // Encode as UTF-8 bytes first (how real JWTs are built), then base64url.
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const makeJwt = (payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }) =>
  `${b64url(header)}.${b64url(payload)}.sig`;

describe('decodeJwt', () => {
  it('decodes header and payload without verifying', () => {
    const token = makeJwt({ sub: 'user-1', name: 'Adám' });
    const decoded = decodeJwt<{ sub: string; name: string }>(token);
    expect(decoded?.payload.sub).toBe('user-1');
    expect(decoded?.payload.name).toBe('Adám'); // UTF-8 round-trips
    expect(decoded?.signature).toBe('sig');
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('a.b')).toBeNull();
    expect(decodeJwt('a.b.c')).toBeNull(); // non-JSON segments
  });
});

describe('isJwtExpired', () => {
  it('reads exp and applies leeway', () => {
    const future = Math.floor(Date.now() / 1000) + 60;
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isJwtExpired(makeJwt({ exp: future }))).toBe(false);
    expect(isJwtExpired(makeJwt({ exp: past }))).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: future }), 120)).toBe(true); // leeway pushes it past
  });

  it('treats undecodable / exp-less tokens as expired', () => {
    expect(isJwtExpired('garbage')).toBe(true);
    expect(isJwtExpired(makeJwt({ sub: 'x' }))).toBe(true);
  });
});

describe('extractBearerToken', () => {
  it('pulls the token from an Authorization header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer   xyz  ')).toBe('xyz');
  });

  it('returns null when absent or not bearer', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
  });
});
