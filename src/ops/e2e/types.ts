import type { TestArtifact } from '../test-report/types';

// cwip/e2e — a declarative, resilient browser-driving toolkit. Tests read as a
// list of named actions piped through `run(...)`, built on a small set of helpers
// that take the app's differences (base url, test-id attribute, timeouts) as
// config. Playwright is a *type-only* dependency here: every action receives a
// `Page` the caller already created, so importing cwip/e2e never loads Playwright
// unless the app uses it.
//
// `Page`/`Locator` are intentionally STRUCTURAL (the subset the toolkit calls),
// not Playwright's own types — so a consuming app's Playwright `Page` is assignable
// regardless of which Playwright version the app vs cwip resolve. (A shared lib
// must not pin consumers to its Playwright version's types.) Option args are loose
// (`any`) so every version's stricter option shapes stay assignable.

/** The chainable locator surface the toolkit uses (structural — any Playwright Locator fits). */
export interface Locator {
  click(opts?: any): Promise<void>;
  fill(value: string, opts?: any): Promise<void>;
  pressSequentially(value: string, opts?: any): Promise<void>;
  press(key: string, opts?: any): Promise<void>;
  setInputFiles(files: any, opts?: any): Promise<void>;
  setChecked(checked: boolean, opts?: any): Promise<void>;
  selectOption(values: any, opts?: any): Promise<any>;
  hover(opts?: any): Promise<void>;
  blur(opts?: any): Promise<void>;
  inputValue(opts?: any): Promise<string>;
  waitFor(opts?: any): Promise<void>;
  count(): Promise<number>;
  getAttribute(name: string, opts?: any): Promise<string | null>;
  isVisible(opts?: any): Promise<boolean>;
  textContent(opts?: any): Promise<string | null>;
  first(): Locator;
  nth(index: number): Locator;
  filter(opts: any): Locator;
  locator(selector: string, opts?: any): Locator;
  getByRole(role: any, opts?: any): Locator;
  getByText(text: string | RegExp, opts?: any): Locator;
  getByLabel(text: string | RegExp, opts?: any): Locator;
  getByPlaceholder(text: string | RegExp, opts?: any): Locator;
}

/** The page surface the toolkit uses (structural — any Playwright Page fits). */
export interface Page {
  goto(url: string, opts?: any): Promise<any>;
  reload(opts?: any): Promise<any>;
  screenshot(opts?: any): Promise<Buffer>;
  content(): Promise<string>;
  url(): string;
  title(): Promise<string>;
  waitForURL(url: any, opts?: any): Promise<void>;
  waitForLoadState(state?: any, opts?: any): Promise<void>;
  keyboard: { press(key: string, opts?: any): Promise<void> };
  on(event: any, listener: any): any;
  off(event: any, listener: any): any;
  locator(selector: string, opts?: any): Locator;
  getByRole(role: any, opts?: any): Locator;
  getByText(text: string | RegExp, opts?: any): Locator;
  getByLabel(text: string | RegExp, opts?: any): Locator;
  getByPlaceholder(text: string | RegExp, opts?: any): Locator;
}

/**
 * What to find on the page. A bare string is shorthand for a test-id (the most
 * resilient locator). The object form layers Playwright's role/text/label/etc.
 * strategies and supports scoping via `within`.
 */
export type Target =
  | string
  | {
      /** `[data-testid="…"]` using the configured `testIdAttribute`. */
      testId?: string;
      /** ARIA role (`button`, `dialog`, `switch`, …). Pair with `name`. */
      role?: string;
      /** Accessible name (used with `role`); a RegExp for patterns. */
      name?: string | RegExp;
      /** Visible substring text (or RegExp). */
      text?: string | RegExp;
      /** Exact visible text. */
      exactText?: string;
      /** Input placeholder (or RegExp). */
      placeholder?: string | RegExp;
      /** Associated `<label>` text (or RegExp). */
      label?: string | RegExp;
      /** `a[href="…"]`. */
      href?: string;
      /** Raw CSS selector (escape hatch). */
      css?: string;
      /** Require an exact (not substring) match for `name`/`text`. */
      exact?: boolean;
      /** Heading level (with `role: 'heading'`). */
      level?: number;
      /** Disambiguate when several match. */
      nth?: number;
      /** Scope the search inside another target. */
      within?: Target;
    };

export interface E2ETimeouts {
  /** Per-interaction (click/fill) and visibility waits. */
  action: number;
  /** Page navigations / URL waits. */
  navigation: number;
  /** Assertion polling budget. */
  expect: number;
  /** `waitForNetworkIdle`. */
  network: number;
}

export interface E2ECaptureConfig {
  /** Capture screenshot+html+console+network when an action fails (default true). */
  onFailure: boolean;
  /** Capture after every action (verbose; default false). */
  perStep: boolean;
  /** Where to write artifacts when no Playwright `testInfo` is attached. */
  dir?: string;
  screenshots: boolean;
  html: boolean;
  console: boolean;
  network: boolean;
}

export interface E2ELogger {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface E2EConfig {
  /** Base url that string paths in `goTo`/`waitForUrl` resolve against. */
  baseUrl?: string;
  /** Attribute `testId` targets resolve to (default `data-testid`). */
  testIdAttribute?: string;
  timeouts?: Partial<E2ETimeouts>;
  /** Backoff schedule for assertion polling (ms). */
  retryIntervals?: number[];
  capture?: Partial<E2ECaptureConfig>;
  logger?: E2ELogger;
}

export interface ResolvedE2EConfig {
  baseUrl: string;
  testIdAttribute: string;
  timeouts: E2ETimeouts;
  retryIntervals: number[];
  capture: E2ECaptureConfig;
  logger?: E2ELogger;
}

/** A captured network exchange (request line + response status). */
export interface NetworkEntry {
  method: string;
  url: string;
  status?: number;
  failure?: string;
}

/** Buffers console/page-error/network events for a page so failures carry context. */
export interface PageRecorder {
  consoleLines(): string[];
  networkEntries(): NetworkEntry[];
  /** Captured artifacts pushed during a run with no Playwright `testInfo`. */
  artifacts(): TestArtifact[];
  pushArtifact(a: TestArtifact): void;
  clear(): void;
  /** Detach the page listeners. */
  dispose(): void;
}

/**
 * The minimal slice of Playwright's `TestInfo` the toolkit uses, declared
 * structurally so cwip/e2e needs no Playwright value import. Pass `testInfo` from
 * a Playwright test and captured artifacts are attached to the run natively.
 */
export interface AttachableTestInfo {
  attach(name: string, options: { body?: Buffer | string; path?: string; contentType?: string }): Promise<void>;
}

export interface E2EContext {
  page: Page;
  config: ResolvedE2EConfig;
  /** Shared mutable scratch threaded through the pipe (ids captured mid-flow, etc.). */
  state: Record<string, unknown>;
  recorder: PageRecorder;
  testInfo?: AttachableTestInfo;
}

/** A named, composable step. Receives and returns the context (threaded by `run`). */
export type E2EAction = (ctx: E2EContext) => Promise<E2EContext>;

/** Thrown when an action ultimately fails; carries what/where + captured artifacts. */
export class E2EActionError extends Error {
  constructor(
    readonly action: string,
    readonly cause: unknown,
    readonly detail: { url?: string; target?: unknown; artifacts?: TestArtifact[] } = {},
  ) {
    const base = cause instanceof Error ? cause.message : String(cause);
    super(`e2e action "${action}" failed: ${base}`);
    this.name = 'E2EActionError';
  }
}
