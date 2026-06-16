// cwip/e2e — declarative, resilient, config-driven browser-driving toolkit.
// Compose named actions through `run(...)`; the kit takes the app's differences
// (base url, test-id attribute, timeouts, capture policy) as config, auto-captures
// debug artifacts (screenshot/html/console/network) on failure, and ships a
// Playwright reporter that funnels E2E runs into the shared cwip test-report model.
// Playwright is a type-only dependency: actions receive a `Page` you create.
export * from './actions';
export { captureArtifacts, emitArtifact } from './capture';
export * from './config';
export * from './createE2E';
export { poll } from './poll';
export { instrumentPage } from './recorder';
export { CwipPlaywrightReporter, type CwipReporterOptions } from './reporter';
export { describeTarget, resolveTarget } from './resolve';
export * from './types';
