import { describe, expect, it } from 'bun:test';
import {
  diffEnvSets,
  type EnvEntry,
  parseEnvFile,
  parseEnvText,
  serializeEnv,
  sortEnvEntries,
  sortEnvText,
  upsertEnvVar,
} from './index';

describe('parseEnvFile', () => {
  it('classifies pairs, comments, and blank lines', () => {
    const entries = parseEnvFile('# a comment\n\nFOO=bar\nexport BAZ="qux"');
    expect(entries.map((e) => e.kind)).toEqual(['comment', 'blank', 'pair', 'pair']);
    expect(entries[2]).toMatchObject({ key: 'FOO', value: 'bar', quote: '' });
    expect(entries[3]).toMatchObject({ key: 'BAZ', value: 'qux', quote: '"', exported: true });
  });

  it('keeps single-quoted values and unwraps them', () => {
    const [e] = parseEnvFile("FOO='a b'");
    expect(e).toMatchObject({ key: 'FOO', value: 'a b', quote: "'" });
  });

  it('treats a non-KEY=VALUE line as a verbatim comment, not a dropped line', () => {
    const entries = parseEnvFile('garbage line');
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('comment');
    expect(entries[0].raw).toBe('garbage line');
  });
});

describe('serializeEnv round-trips', () => {
  it('reproduces the original text (incl. trailing newline)', () => {
    const text = '# header\nFOO=bar\nexport BAZ="qux"\n';
    expect(serializeEnv(parseEnvFile(text))).toBe(text);
  });

  it('reflects only edited values', () => {
    const entries = parseEnvFile('A=1\nB=2');
    entries[0] = { ...entries[0], value: '99' };
    expect(serializeEnv(entries)).toBe('A=99\nB=2');
  });
});

describe('parseEnvText', () => {
  it('collapses to a key→value map, last value winning', () => {
    expect(parseEnvText('# c\nA=1\nA=2\nB=x')).toEqual({ A: '2', B: 'x' });
  });
});

describe('upsertEnvVar', () => {
  it('updates an existing key in place', () => {
    expect(upsertEnvVar('A=1\nB=2', 'A', '9')).toBe('A=9\nB=2');
  });

  it('preserves export + quoting on update', () => {
    expect(upsertEnvVar('export A="old"', 'A', 'new')).toBe('export A="new"');
  });

  it('appends a new key with a trailing newline', () => {
    expect(upsertEnvVar('A=1\n', 'B', '2')).toBe('A=1\nB=2\n');
  });

  it('flattens newlines in the value to spaces', () => {
    expect(upsertEnvVar('', 'A', 'one\ntwo')).toBe('A=one two\n');
  });
});

describe('sortEnvEntries', () => {
  it('sorts pairs alphabetically, keeping each leading comment block', () => {
    const text = '# beta\nB=2\n\n# alpha\nA=1';
    const sorted = serializeEnv(sortEnvEntries(parseEnvFile(text)));
    expect(sorted).toBe('# alpha\nA=1\n# beta\nB=2');
  });

  it('sortEnvText is parse→sort→serialize', () => {
    expect(sortEnvText('C=3\nA=1\nB=2')).toBe('A=1\nB=2\nC=3');
  });

  it('keeps trailing comments with no following pair at the end', () => {
    const entries: EnvEntry[] = parseEnvFile('B=2\nA=1\n# trailer');
    expect(serializeEnv(sortEnvEntries(entries))).toBe('A=1\nB=2\n# trailer');
  });
});

describe('diffEnvSets', () => {
  it('flags missing keys and value disagreements', () => {
    const diff = diffEnvSets([
      { label: 'prod', text: 'API_URL=https://p\nSHARED=1' },
      { label: 'stage', text: 'API_URL=https://s\nONLY_STAGE=x' },
    ]);
    expect(diff.labels).toEqual(['prod', 'stage']);
    const byKey = Object.fromEntries(diff.rows.map((r) => [r.key, r]));

    expect(byKey.API_URL.differs).toBe(true); // present in both, different value
    expect(byKey.API_URL.missingIn).toEqual([]);

    expect(byKey.SHARED.differs).toBe(true); // missing in stage
    expect(byKey.SHARED.missingIn).toEqual(['stage']);

    expect(byKey.ONLY_STAGE.values).toEqual({ prod: undefined, stage: 'x' });
  });

  it('does not flag a key present and equal everywhere', () => {
    const diff = diffEnvSets([
      { label: 'a', text: 'K=same' },
      { label: 'b', text: 'K=same' },
    ]);
    expect(diff.rows[0].differs).toBe(false);
  });

  it('returns rows sorted by key', () => {
    const diff = diffEnvSets([{ label: 'a', text: 'Z=1\nA=2\nM=3' }]);
    expect(diff.rows.map((r) => r.key)).toEqual(['A', 'M', 'Z']);
  });
});
