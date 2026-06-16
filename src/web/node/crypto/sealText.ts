/**
 * Encrypt/compress arbitrary text into a single compact, shareable STRING (paste
 * into email/Slack/SMS), and decode it back — the encoder/decoder pair.
 *
 *   const token = sealToText(JSON.stringify(data), "my passphrase"); // "rbz1_…"
 *   const data  = JSON.parse(openFromText(token, "my passphrase"));
 *
 * This is REAL encryption, not reversible obfuscation: text is Brotli-compressed,
 * then AES-256-GCM-encrypted under a scrypt key derived from the password + a
 * random per-token salt (salt/iv/tag travel packed in the token; the password
 * never does). A man-in-the-middle sees only ciphertext; a wrong password or any
 * tampering fails the GCM auth tag (it won't silently decode). With no password it
 * still produces a compact compressed string ("rbp1_…") — shareable, just not secret.
 *
 * Shortest-string design: compress BEFORE encrypting (ciphertext is incompressible),
 * pack salt|iv|tag|ciphertext into one buffer, and base64url-encode (only ~5% larger
 * than base85 but survives email/SMS/line-wrapping with no +/=/newline breakage).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { deriveKey } from './secretBox';

const ALGO = 'aes-256-gcm';
const SEALED = 'rbz1_'; // encrypted (password required to open)
const PACKED = 'rbp1_'; // compressed only (no secrecy)
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const compress = (buf: Buffer): Buffer => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });

/**
 * Encode `text` into a compact shareable string. With a `password` the string is
 * AES-256-GCM encrypted (`rbz1_…`); without one it's just Brotli-compressed
 * (`rbp1_…`) — still compact + shareable, but readable by anyone.
 */
export function sealToText(text: string, password?: string): string {
  const compressed = compress(Buffer.from(text, 'utf8'));
  if (!password) return PACKED + compressed.toString('base64url');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey(password, salt.toString('hex'));
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return SEALED + Buffer.concat([salt, iv, tag, ciphertext]).toString('base64url');
}

/** True if `token` is an encrypted (password-required) sealed string. */
export function isSealedText(token: unknown): boolean {
  return typeof token === 'string' && token.startsWith(SEALED);
}

/** True if `token` is a packed (compressed, not secret) string. */
export function isPackedText(token: unknown): boolean {
  return typeof token === 'string' && token.startsWith(PACKED);
}

/**
 * Decode a string produced by `sealToText`. A `rbz1_` token needs the matching
 * `password` (throws on wrong password / tamper); a `rbp1_` token needs none.
 */
export function openFromText(token: string, password?: string): string {
  if (isPackedText(token)) {
    return brotliDecompressSync(Buffer.from(token.slice(PACKED.length), 'base64url')).toString('utf8');
  }
  if (!isSealedText(token)) throw new Error('not a sealed/packed string (expected an rbz1_/rbp1_ token)');
  if (!password) throw new Error('this string is password-encrypted — a password is required to open it');
  const raw = Buffer.from(token.slice(SEALED.length), 'base64url');
  const salt = raw.subarray(0, SALT_BYTES);
  const iv = raw.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const tag = raw.subarray(SALT_BYTES + IV_BYTES, SALT_BYTES + IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(SALT_BYTES + IV_BYTES + TAG_BYTES);
  const key = deriveKey(password, salt.toString('hex'));
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  let plain: Buffer;
  try {
    plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('could not decrypt — wrong password, or the string is corrupt/tampered');
  }
  return brotliDecompressSync(plain).toString('utf8');
}
