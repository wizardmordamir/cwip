import { describe, expect, it } from 'bun:test';
import { decryptSecret, deriveKey, encryptSecret, isEncryptedSecret, safeEqual } from '.';

describe('secretBox', () => {
  const key = deriveKey('server-secret', 'user-123');

  it('round-trips a secret', () => {
    const box = encryptSecret('hunter2 🔐', key);
    expect(isEncryptedSecret(box)).toBe(true);
    expect(box).not.toContain('hunter2');
    expect(decryptSecret(box, key)).toBe('hunter2 🔐');
  });

  it('produces a different ciphertext each time (random IV) but decrypts the same', () => {
    const a = encryptSecret('x', key);
    const b = encryptSecret('x', key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe('x');
    expect(decryptSecret(b, key)).toBe('x');
  });

  it('fails to decrypt with the wrong key', () => {
    const box = encryptSecret('secret', key);
    expect(() => decryptSecret(box, deriveKey('server-secret', 'other-user'))).toThrow();
  });

  it('detects tampering (GCM auth tag)', () => {
    const box = encryptSecret('secret', key);
    const parts = box.split('.');
    // Flip a byte in the ciphertext segment.
    const tampered = Buffer.from(parts[3], 'base64url');
    tampered[0] ^= 0xff;
    parts[3] = tampered.toString('base64url');
    expect(() => decryptSecret(parts.join('.'), key)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptSecret('not-a-box', key)).toThrow(/format/);
    expect(isEncryptedSecret('nope')).toBe(false);
  });

  it('deriveKey is deterministic and salt-separated', () => {
    expect(deriveKey('s', 'a').equals(deriveKey('s', 'a'))).toBe(true);
    expect(deriveKey('s', 'a').equals(deriveKey('s', 'b'))).toBe(false);
    expect(() => deriveKey('', 'a')).toThrow();
  });

  it('safeEqual compares correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
