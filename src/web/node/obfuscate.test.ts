import { describe, expect, it } from 'bun:test';
import { deobfuscate, obfuscate } from './obfuscate';

describe('obfuscate / deobfuscate', () => {
  it('round-trips arbitrary strings', async () => {
    for (const sample of [
      'hello world',
      '',
      'a',
      'export const x = 1;\nexport const y = 2;\n',
      '🦆 unicode ☕ and "quotes" + symbols /\\=',
      'x'.repeat(5000),
    ]) {
      expect(await deobfuscate(await obfuscate(sample))).toBe(sample);
    }
  });

  it('produces output that is not the plain string', async () => {
    const encoded = await obfuscate('the quick brown fox jumps over the lazy dog');
    expect(encoded).not.toBe('the quick brown fox jumps over the lazy dog');
    expect(encoded).not.toContain('quick');
  });
});
