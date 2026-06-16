/**
 * Parse a Netscape "bookmark file" (the `bookmarks.html` every major browser —
 * Chrome, Edge, Firefox, Safari — exports) into a flat, importable list. Each
 * link carries the folder path it was filed under, its add date, and (when the
 * export includes one) the data-URI favicon.
 *
 *   const links = parseBookmarksHtml(htmlText);
 *   // [{ title, url, folders: ['Bookmarks bar', 'Dev'], addedAt?, icon? }, …]
 *
 * Dependency-free and DOM-free (regex over the tag stream), so it runs the same
 * in the browser and on a server. The format is loosely structured — nested
 * `<DL>` lists with `<DT><H3>Folder` headers and `<DT><A HREF…>` links — so the
 * parser tracks a folder stack as it walks `<H3>` (push) and `</DL>` (pop).
 */

export interface ParsedBookmark {
  title: string;
  url: string;
  /** Folder path from the export root, outermost first (`[]` at top level). */
  folders: string[];
  /** Bookmark add time, if the export carried ADD_DATE (epoch seconds → Date). */
  addedAt?: Date;
  /** Favicon data URI, if the export carried an ICON attribute. */
  icon?: string;
}

const ATTR = (tag: string, name: string): string | undefined => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : undefined;
};

// Minimal HTML-entity decode for the text/attributes bookmark files use.
const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");

export const parseBookmarksHtml = (html: string): ParsedBookmark[] => {
  const out: ParsedBookmark[] = [];
  const folders: string[] = [];
  // Match, in document order: a folder header (<H3>…</H3>), a list close (</DL>),
  // or an anchor (<A …>…</A>). That ordered walk is what lets us keep the folder
  // stack correct.
  const token = /<h3[^>]*>(.*?)<\/h3>|<\/dl>|<a\s+([^>]*?)>(.*?)<\/a>/gis;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
  while ((m = token.exec(html)) !== null) {
    if (m[1] !== undefined) {
      // <H3>Folder</H3> — entering a new folder.
      folders.push(decode(m[1].trim()));
    } else if (m[0].toLowerCase().startsWith('</dl')) {
      // Leaving the current folder.
      folders.pop();
    } else if (m[2] !== undefined) {
      const attrs = m[2];
      const url = ATTR(attrs, 'href');
      if (!url) {
        continue;
      }
      const addDate = ATTR(attrs, 'add_date');
      const epoch = addDate ? Number.parseInt(addDate, 10) : Number.NaN;
      out.push({
        title: decode((m[3] ?? '').trim()) || url,
        url: decode(url),
        folders: [...folders],
        ...(Number.isFinite(epoch) && epoch > 0 ? { addedAt: new Date(epoch * 1000) } : {}),
        ...(ATTR(attrs, 'icon') ? { icon: ATTR(attrs, 'icon') } : {}),
      });
    }
  }
  return out;
};
