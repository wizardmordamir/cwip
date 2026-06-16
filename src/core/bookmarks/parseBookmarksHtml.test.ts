import { describe, expect, it } from 'bun:test';
import { parseBookmarksHtml } from '.';

// A trimmed but representative Chrome export.
const SAMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://example.com/" ADD_DATE="1700000100" ICON="data:image/png;base64,AAAA">Example &amp; Co</A>
        <DT><H3>Dev</H3>
        <DL><p>
            <DT><A HREF="https://github.com/">GitHub</A>
        </DL><p>
        <DT><A HREF="https://news.example.com/">News</A>
    </DL><p>
    <DT><A HREF="https://top-level.example/">Top Level</A>
</DL><p>`;

describe('parseBookmarksHtml', () => {
  it('extracts links with their folder paths, dates, and icons', () => {
    const links = parseBookmarksHtml(SAMPLE);
    const byUrl = Object.fromEntries(links.map((l) => [l.url, l]));

    expect(links).toHaveLength(4);

    expect(byUrl['https://example.com/'].title).toBe('Example & Co'); // entity-decoded
    expect(byUrl['https://example.com/'].folders).toEqual(['Bookmarks bar']);
    expect(byUrl['https://example.com/'].addedAt?.toISOString()).toBe('2023-11-14T22:15:00.000Z');
    expect(byUrl['https://example.com/'].icon).toContain('data:image/png');

    // Nested folder.
    expect(byUrl['https://github.com/'].folders).toEqual(['Bookmarks bar', 'Dev']);
    // Folder closed correctly — back up one level.
    expect(byUrl['https://news.example.com/'].folders).toEqual(['Bookmarks bar']);
    // Back to the root.
    expect(byUrl['https://top-level.example/'].folders).toEqual([]);
  });

  it('falls back to the url as title and tolerates no dates/icons', () => {
    const links = parseBookmarksHtml('<DL><DT><A HREF="https://x.io/"></A></DL>');
    expect(links).toEqual([{ title: 'https://x.io/', url: 'https://x.io/', folders: [] }]);
  });

  it('returns [] for empty / non-bookmark input', () => {
    expect(parseBookmarksHtml('')).toEqual([]);
    expect(parseBookmarksHtml('<html><body>no bookmarks</body></html>')).toEqual([]);
  });
});
