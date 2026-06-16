import { describe, expect, it } from 'bun:test';
import { toCsv } from '.';

describe('toCsv', () => {
  it('emits a header row and quotes values with delimiter/quote/newline', () => {
    const out = toCsv([
      { a: 1, b: 'x,y' },
      { a: 2, b: 'line\nbreak' },
    ]);
    expect(out).toBe(['a,b', '1,"x,y"', '2,"line\nbreak"'].join('\n'));
  });

  it('doubles embedded quotes (RFC 4180)', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""');
  });

  it('supports a custom delimiter (TSV) and header:false', () => {
    expect(toCsv([{ a: 1, b: 2 }], undefined, { delimiter: '\t' })).toBe('a\tb\n1\t2');
    expect(toCsv([{ a: 1 }], ['a'], { header: false })).toBe('1');
  });

  it('quotes a tab when it is the delimiter', () => {
    expect(toCsv([{ a: 'x\ty' }], ['a'], { delimiter: '\t', header: false })).toBe('"x\ty"');
  });
});
