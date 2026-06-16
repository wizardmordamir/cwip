import type { E2ECaptureConfig, E2EConfig, E2ETimeouts, ResolvedE2EConfig } from './types';

const DEFAULT_TIMEOUTS: E2ETimeouts = { action: 10_000, navigation: 20_000, expect: 10_000, network: 30_000 };
const DEFAULT_RETRY_INTERVALS = [250, 500, 1000, 2000];
const DEFAULT_CAPTURE: E2ECaptureConfig = {
  onFailure: true,
  perStep: false,
  screenshots: true,
  html: true,
  console: true,
  network: true,
};

/** Fill an `E2EConfig` with defaults, normalizing the base url (no trailing slash). */
export const resolveE2EConfig = (config: E2EConfig = {}): ResolvedE2EConfig => ({
  baseUrl: (config.baseUrl ?? '').replace(/\/+$/, ''),
  testIdAttribute: config.testIdAttribute ?? 'data-testid',
  timeouts: { ...DEFAULT_TIMEOUTS, ...config.timeouts },
  retryIntervals: config.retryIntervals ?? DEFAULT_RETRY_INTERVALS,
  capture: { ...DEFAULT_CAPTURE, ...config.capture },
  ...(config.logger !== undefined && { logger: config.logger }),
});

/** Resolve a path/url against the config base url. Absolute urls pass through. */
export const resolveUrl = (config: ResolvedE2EConfig, pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!config.baseUrl) return pathOrUrl;
  return `${config.baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};
