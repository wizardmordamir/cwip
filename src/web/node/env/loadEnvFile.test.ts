import { initializeGlobalMocks, resetAllMocks } from '@/ops/testing';

const mockManager = initializeGlobalMocks();

import { beforeEach, describe, expect, it } from 'bun:test';
import { clearEnvFileCache, loadEnvFile, parseEnvText } from '.';

const setFileText = (text: string | null) => {
  mockManager.registry.fs.readFileSync.mockImplementation(() => {
    if (text === null) {
      throw new Error('ENOENT');
    }
    return text;
  });
};

beforeEach(() => {
  resetAllMocks();
  clearEnvFileCache();
});

describe('parseEnvText', () => {
  it('parses keys, skipping comments and blank/malformed lines', () => {
    const text = ['# comment', '', 'A=1', 'NOEQUALS', 'B = spaced ', 'C=has=equals'].join('\n');
    expect(parseEnvText(text)).toEqual({ A: '1', B: 'spaced', C: 'has=equals' });
  });

  it('unwraps quotes and honors the export prefix', () => {
    const text = ['D="quoted value"', "E='single'", 'export F=exported', 'G=""'].join('\n');
    expect(parseEnvText(text)).toEqual({ D: 'quoted value', E: 'single', F: 'exported', G: '' });
  });
});

describe('loadEnvFile', () => {
  it('reads and caches a file per path', () => {
    setFileText('TOKEN=abc');
    expect(loadEnvFile('/app/.env')).toEqual({ TOKEN: 'abc' });
    setFileText('TOKEN=changed');
    expect(loadEnvFile('/app/.env')).toEqual({ TOKEN: 'abc' }); // cached
    clearEnvFileCache('/app/.env');
    expect(loadEnvFile('/app/.env')).toEqual({ TOKEN: 'changed' });
  });

  it('caches per path independently', () => {
    setFileText('A=1');
    expect(loadEnvFile('/one/.env')).toEqual({ A: '1' });
    setFileText('B=2');
    expect(loadEnvFile('/two/.env')).toEqual({ B: '2' });
    expect(loadEnvFile('/one/.env')).toEqual({ A: '1' }); // still cached
  });

  it('returns {} for a missing file (and caches that)', () => {
    setFileText(null);
    expect(loadEnvFile('/missing/.env')).toEqual({});
  });
});
