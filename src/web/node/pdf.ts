/**
 * Extract text from a PDF — the upgrade many "read this report" flows need. The
 * PDF backend (`unpdf`) is an OPTIONAL peer loaded lazily, so importing
 * `cwip/node` never pulls it in; only calling `extractPdfText` does, and you get
 * a clear "install unpdf" error when it's absent (mirrors how cwip/excel loads
 * `xlsx`). The backend is also injectable, so callers can swap in another PDF
 * library and tests can run without the dep.
 *
 *   const { text, pages } = await extractPdfText(await readFile('report.pdf'));
 *
 * Node/Bun only (a PDF library + binary input). No layout/OCR — it returns the
 * embedded text layer, page by page; scanned-image PDFs yield little/nothing.
 */

/** Per-page + merged text extracted from a PDF. */
export interface PdfTextResult {
  /** Every page's text joined with a blank line between pages. */
  text: string;
  /** Text of each page, in order. */
  pages: string[];
  pageCount: number;
}

/** The minimal PDF backend `extractPdfText` drives (unpdf-compatible, injectable). */
export interface PdfTextBackend {
  /** Return each page's text for the given PDF bytes. */
  extractPages(data: Uint8Array): Promise<string[]>;
}

export interface ExtractPdfTextOptions {
  /** Swap the backend (tests / an alternative library). Default: lazy-load `unpdf`. */
  backend?: PdfTextBackend;
}

// Normalize to a PLAIN Uint8Array. Node's `readFile` yields a Buffer (a
// Uint8Array subclass) but PDF backends (pdf.js/unpdf) reject anything that
// isn't exactly a Uint8Array, so reslice subclasses into a plain view.
const toUint8 = (data: Uint8Array | ArrayBuffer): Uint8Array => {
  if (data instanceof Uint8Array) {
    return data.constructor === Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
};

/** The default backend: lazy-load `unpdf` and read its per-page text layer. */
const loadUnpdfBackend = async (): Promise<PdfTextBackend> => {
  let mod: typeof import('unpdf');
  try {
    mod = await import('unpdf');
  } catch {
    throw new Error(
      'cwip/node extractPdfText requires the optional dependency "unpdf", which is not installed. ' +
        'Install it (e.g. `bun add unpdf` / `npm install unpdf`) to extract PDF text.',
    );
  }
  return {
    async extractPages(data) {
      const pdf = await mod.getDocumentProxy(data);
      const { text } = await mod.extractText(pdf, { mergePages: false });
      return Array.isArray(text) ? text : [text];
    },
  };
};

/**
 * Extract a PDF's embedded text, returning per-page strings and a merged string.
 * Accepts a `Uint8Array`/`Buffer` (or `ArrayBuffer`) of the PDF bytes.
 */
export const extractPdfText = async (
  data: Uint8Array | ArrayBuffer,
  options: ExtractPdfTextOptions = {},
): Promise<PdfTextResult> => {
  const backend = options.backend ?? (await loadUnpdfBackend());
  const pages = await backend.extractPages(toUint8(data));
  return { text: pages.join('\n\n'), pages, pageCount: pages.length };
};
