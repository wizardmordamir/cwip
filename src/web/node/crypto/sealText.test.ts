import { describe, expect, it } from 'bun:test';
import { isPackedText, isSealedText, openFromText, sealToText } from './sealText';

const SECRET = JSON.stringify({
  apiKey: 'super-secret',
  rows: Array.from({ length: 50 }, (_, i) => ({ i, v: `row ${i}` })),
});

describe('sealToText / openFromText', () => {
  it('round-trips with a password (AES-GCM)', () => {
    const token = sealToText(SECRET, 'hunter2');
    expect(isSealedText(token)).toBe(true);
    expect(token.startsWith('rbz1_')).toBe(true);
    expect(openFromText(token, 'hunter2')).toBe(SECRET);
  });

  it('round-trips without a password (compressed, not secret)', () => {
    const token = sealToText(SECRET);
    expect(isPackedText(token)).toBe(true);
    expect(openFromText(token)).toBe(SECRET);
  });

  it('ciphertext leaks neither the plaintext nor compresses trivially', () => {
    const token = sealToText(SECRET, 'pw');
    expect(token).not.toContain('super-secret');
    // Two seals of the same input differ (random salt+iv) — no fixed ciphertext.
    expect(sealToText(SECRET, 'pw')).not.toBe(token);
  });

  it('the sealed string is reasonably short (compress-then-encrypt)', () => {
    // Repetitive JSON should seal to far less than its raw length.
    const token = sealToText(SECRET, 'pw');
    expect(token.length).toBeLessThan(SECRET.length);
  });

  it('rejects a wrong password and tampering', () => {
    const token = sealToText(SECRET, 'right');
    expect(() => openFromText(token, 'wrong')).toThrow(/wrong password|corrupt|tampered/);
    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(() => openFromText(tampered, 'right')).toThrow();
  });

  it('requires a password for a sealed token, and errors on junk', () => {
    expect(() => openFromText(sealToText(SECRET, 'pw'))).toThrow(/password is required/);
    expect(() => openFromText('not-a-token')).toThrow(/sealed\/packed/);
  });
});
