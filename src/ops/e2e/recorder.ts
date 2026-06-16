import type { TestArtifact } from '../test-report/types';
import type { NetworkEntry, Page, PageRecorder, ResolvedE2EConfig } from './types';

/**
 * Attach console / page-error / network listeners to a page and buffer them in a
 * ring, so when an action fails the captured screenshot/HTML is accompanied by
 * what the page logged and which requests it made. Same idea as `startTestServer`'s
 * log ring buffer, for the browser. Returns a `PageRecorder` the context carries.
 */
export const instrumentPage = (page: Page, config: ResolvedE2EConfig, maxEntries = 500): PageRecorder => {
  const consoleBuf: string[] = [];
  const networkBuf: NetworkEntry[] = [];
  const arts: TestArtifact[] = [];
  const push = <T>(arr: T[], item: T): void => {
    arr.push(item);
    if (arr.length > maxEntries) arr.shift();
  };

  const onConsole = (msg: { type(): string; text(): string }): void =>
    push(consoleBuf, `[${msg.type()}] ${msg.text()}`);
  const onPageError = (err: Error): void => push(consoleBuf, `[pageerror] ${err.message}`);
  const onResponse = (res: { request(): { method(): string }; url(): string; status(): number }): void =>
    push(networkBuf, { method: res.request().method(), url: res.url(), status: res.status() });
  const onRequestFailed = (req: { method(): string; url(): string; failure(): { errorText: string } | null }): void =>
    push(networkBuf, { method: req.method(), url: req.url(), failure: req.failure()?.errorText });

  if (config.capture.console) {
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
  }
  if (config.capture.network) {
    page.on('response', onResponse);
    page.on('requestfailed', onRequestFailed);
  }

  return {
    consoleLines: () => [...consoleBuf],
    networkEntries: () => [...networkBuf],
    artifacts: () => [...arts],
    pushArtifact: (a) => arts.push(a),
    clear: () => {
      consoleBuf.length = 0;
      networkBuf.length = 0;
      arts.length = 0;
    },
    dispose: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
    },
  };
};
