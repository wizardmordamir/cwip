import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Authenticated symmetric encryption for data at rest (AES-256-GCM). Use it to
 * store secrets (API tokens, vault passwords, OAuth refresh tokens) encrypted in
 * a DB so a database leak alone doesn't expose them — the key lives in the app's
 * environment, not the database.
 *
 *   const key = deriveKey(process.env.SECRET_KEY!, userId);
 *   const box = encryptSecret('hunter2', key);   // opaque string, safe to store
 *   const plain = decryptSecret(box, key);        // 'hunter2'
 *
 * GCM is authenticated: a tampered ciphertext (or wrong key) makes `decryptSecret`
 * throw rather than return garbage. The output is a self-describing
 * `v1.<iv>.<tag>.<ciphertext>` string (all base64url), so the format can evolve.
 *
 * This is at-rest confidentiality, NOT zero-knowledge: whoever holds the key can
 * decrypt. For a recoverable scheme (e.g. reset-via-email), derive the key from a
 * server secret, not the user's password.
 */

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256

const b64 = (buf: Buffer): string => buf.toString('base64url');
const unb64 = (s: string): Buffer => Buffer.from(s, 'base64url');

/**
 * Derive a 32-byte key from a secret + a (non-secret) salt via scrypt. Pass a
 * stable per-record salt (e.g. a user id) so different records get different
 * keys from the same base secret. Deterministic: same inputs → same key.
 */
export const deriveKey = (secret: string, salt: string): Buffer => {
  if (!secret) {
    throw new Error('deriveKey: a non-empty secret is required');
  }
  return scryptSync(secret, salt, KEY_BYTES);
};

/** Encrypt `plaintext` with a 32-byte key, returning an opaque storable string. */
export const encryptSecret = (plaintext: string, key: Buffer): string => {
  if (key.length !== KEY_BYTES) {
    throw new Error(`encryptSecret: key must be ${KEY_BYTES} bytes (use deriveKey)`);
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${b64(iv)}.${b64(tag)}.${b64(ciphertext)}`;
};

/** Decrypt a string produced by `encryptSecret`. Throws on tamper / wrong key / bad format. */
export const decryptSecret = (payload: string, key: Buffer): string => {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('decryptSecret: unrecognized payload format');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, key, unb64(ivB64));
  decipher.setAuthTag(unb64(tagB64));
  return Buffer.concat([decipher.update(unb64(dataB64)), decipher.final()]).toString('utf8');
};

/** Whether a string looks like an `encryptSecret` payload (cheap shape check, no key needed). */
export const isEncryptedSecret = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(`${VERSION}.`) && value.split('.').length === 4;

/** Constant-time string compare (e.g. for comparing tokens/hashes). */
export const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
};
