import { describe, expect, it } from 'bun:test';
import { extractPdfText, type PdfTextBackend } from './pdf';

/** Build a minimal single-page PDF whose text layer is `text`. */
const makePdf = (text: string): Uint8Array => {
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length 60 >>\nstream\nBT /F1 18 Tf 72 700 Td (${text}) Tj ET\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const o of objs) {
    offsets.push(pdf.length);
    pdf += o;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

describe('extractPdfText', () => {
  it('joins per-page text and reports the page count (injected backend)', async () => {
    const backend: PdfTextBackend = { extractPages: async () => ['page one', 'page two'] };
    const result = await extractPdfText(new Uint8Array(), { backend });
    expect(result.pages).toEqual(['page one', 'page two']);
    expect(result.pageCount).toBe(2);
    expect(result.text).toBe('page one\n\npage two');
  });

  it('accepts an ArrayBuffer and passes the bytes through to the backend', async () => {
    let seen: Uint8Array | null = null;
    const backend: PdfTextBackend = {
      extractPages: async (data) => {
        seen = data;
        return ['x'];
      },
    };
    const buf = new TextEncoder().encode('hi').buffer;
    await extractPdfText(buf, { backend });
    expect(seen).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(seen!)).toBe('hi');
  });

  it('normalizes a Buffer (readFile output) to a plain Uint8Array for the backend', async () => {
    let ctor: unknown = null;
    const backend: PdfTextBackend = {
      extractPages: async (data) => {
        ctor = data.constructor;
        return ['ok'];
      },
    };
    // A Buffer is a Uint8Array subclass; the backend must receive a plain one.
    await extractPdfText(Buffer.from('hi'), { backend });
    expect(ctor).toBe(Uint8Array);
  });

  it('reads the real text layer from a PDF via the default unpdf backend', async () => {
    const result = await extractPdfText(makePdf('Hello AppScan SAST Critical 3'));
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain('Hello AppScan SAST Critical 3');
  });
});
