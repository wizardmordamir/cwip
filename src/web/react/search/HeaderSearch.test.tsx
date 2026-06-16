import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeaderSearch, shouldCollapseSearch } from './HeaderSearch';

describe('shouldCollapseSearch', () => {
  it('pins the layout for the non-auto modes', () => {
    expect(shouldCollapseSearch(9999, 240, 'always')).toBe(true);
    expect(shouldCollapseSearch(10, 240, 'never')).toBe(false);
  });

  it('auto: never collapses before the first measurement (null width)', () => {
    expect(shouldCollapseSearch(null, 240, 'auto')).toBe(false);
  });

  it('auto: collapses only once the measured track is below the threshold', () => {
    expect(shouldCollapseSearch(200, 240, 'auto')).toBe(true);
    expect(shouldCollapseSearch(240, 240, 'auto')).toBe(false);
    expect(shouldCollapseSearch(400, 240, 'auto')).toBe(false);
  });
});

describe('HeaderSearch', () => {
  it('renders the full field by default (pre-measurement) with the accessible label', () => {
    const html = renderToStaticMarkup(<HeaderSearch value="" onChange={() => {}} label="Search everything" />);
    expect(html).toContain('<input');
    expect(html).toContain('aria-label="Search everything"');
    expect(html).toContain('<svg'); // the default magnifying-glass glyph
    expect(html).toContain('h-4 w-4'); // inline leading icon stays small (16px)
  });

  it('collapseMode="always" renders just the icon trigger — no input until it is opened', () => {
    const html = renderToStaticMarkup(<HeaderSearch value="" onChange={() => {}} collapseMode="always" />);
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Search"');
    expect(html).not.toContain('<input');
    // The standalone collapsed trigger glyph is the larger 24px header size.
    expect(html).toContain('h-6 w-6');
  });

  it('does not render the results panel while the query is empty', () => {
    const html = renderToStaticMarkup(
      <HeaderSearch value="" onChange={() => {}}>
        {() => <div>RESULTS</div>}
      </HeaderSearch>,
    );
    expect(html).not.toContain('RESULTS');
  });
});
