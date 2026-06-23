import { describe, expect, it } from 'bun:test';
import { parseSiteProbe, SITE_SMOKE_HOST_SOURCE, SITE_SMOKE_PROBE_SENTINEL } from './host';

describe('parseSiteProbe', () => {
  it('parses a well-formed probe line amid surrounding noise', () => {
    const probe = {
      launched: true,
      routes: [
        {
          path: '/',
          navigated: true,
          status: 200,
          rootFound: true,
          rootHtmlLength: 12,
          landmarkChecked: false,
          landmarkFound: false,
          consoleErrors: [],
          pageErrors: [],
        },
      ],
    };
    const stdout = `some log\n${SITE_SMOKE_PROBE_SENTINEL}${JSON.stringify(probe)}\nmore log`;
    const parsed = parseSiteProbe(stdout);
    expect(parsed.launched).toBe(true);
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.routes[0]).toMatchObject({ path: '/', navigated: true, status: 200, rootHtmlLength: 12 });
  });

  it('coerces missing/odd fields to safe defaults', () => {
    const stdout = `${SITE_SMOKE_PROBE_SENTINEL}${JSON.stringify({ launched: true, routes: [{ path: '/x' }] })}`;
    const parsed = parseSiteProbe(stdout);
    expect(parsed.routes[0]).toMatchObject({
      path: '/x',
      navigated: false,
      rootFound: false,
      rootHtmlLength: 0,
      consoleErrors: [],
      pageErrors: [],
    });
  });

  it('returns an inconclusive probe (launched:false) when no sentinel line exists', () => {
    const parsed = parseSiteProbe('nothing here', 'boom on stderr');
    expect(parsed.launched).toBe(false);
    expect(parsed.routes).toHaveLength(0);
    expect(parsed.error).toContain('boom on stderr');
  });

  it('takes the LAST sentinel line if more than one is present', () => {
    const a = `${SITE_SMOKE_PROBE_SENTINEL}${JSON.stringify({ launched: false, routes: [] })}`;
    const b = `${SITE_SMOKE_PROBE_SENTINEL}${JSON.stringify({ launched: true, routes: [{ path: '/' }] })}`;
    const parsed = parseSiteProbe(`${a}\n${b}`);
    expect(parsed.launched).toBe(true);
  });
});

describe('SITE_SMOKE_HOST_SOURCE', () => {
  it('is self-contained, backtick-free JS that preserves escapes', () => {
    // Embedded via String.raw — the emit newline must survive as a real escape, not a literal newline.
    expect(SITE_SMOKE_HOST_SOURCE).toContain("process.stdout.write('\\nSITE_SMOKE_PROBE:'");
    expect(SITE_SMOKE_HOST_SOURCE).toContain('await import(pwPath)'); // resolves the app's playwright
    expect(SITE_SMOKE_HOST_SOURCE).toContain("'playwright'"); // default fallback specifier
    expect(SITE_SMOKE_HOST_SOURCE).toContain('vite-error-overlay');
    expect(SITE_SMOKE_HOST_SOURCE).not.toContain('`'); // no backticks (safe to embed)
    expect(SITE_SMOKE_HOST_SOURCE).not.toContain('${'); // no template interpolation (safe to embed)
  });

  it('parses as a valid ES module (real syntax check)', () => {
    const transpiler = new Bun.Transpiler({ loader: 'js' });
    expect(() => transpiler.transformSync(SITE_SMOKE_HOST_SOURCE)).not.toThrow();
  });
});
