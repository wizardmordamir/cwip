import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach } from 'bun:test';

// DOM test environment for the React component tests. Preloaded (see bunfig.toml)
// so a real (happy-dom) `window`/`document` exists for the whole test process —
// `@testing-library/react` can then render components into a live DOM and drive
// their interactive behavior (clicks, focus/blur, keyboard).
//
// Why register it globally for ALL tests, not just the React ones: nothing in cwip
// outside `src/web/react/*` branches on `typeof window`/`typeof document`, so a DOM
// being present is inert for the pure (core/server/ops) tests — and the React
// components that DO branch (Tooltip, NavItemMenu, Dropdown, …) correctly pick the
// `useLayoutEffect` path they need under test. Registration is a one-time startup
// cost; pure tests that never touch the DOM pay nothing per test.
if (typeof globalThis.document === 'undefined') {
  // happy-dom's registrator also swaps in its own browser `fetch`/`Request`/
  // `Response`/`Headers`, whose Same-Origin Policy rejects the real-server HTTP that
  // cwip's server integration tests (serveApp, createApp, health) make against
  // 127.0.0.1. No React component test needs the DOM `fetch`, so capture Bun's
  // native networking primitives and restore them after registering — the React
  // tests get their DOM, the server tests keep Bun's real fetch.
  const native = {
    fetch: globalThis.fetch,
    Request: globalThis.Request,
    Response: globalThis.Response,
    Headers: globalThis.Headers,
  };
  GlobalRegistrator.register();
  Object.assign(globalThis, native);
}

// React's act() warnings are suppressed only inside an "act environment"; RTL wraps
// render/fireEvent in act, so flag it on.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Import Testing Library only AFTER the DOM is registered: @testing-library/dom's
// `screen` binds its queries to `document.body` at module-load, so loading it before
// `register()` would permanently bind it to a "no document" stub. A dynamic import
// keeps it out of the (hoisted) static import graph that runs before this line.
const { cleanup } = await import('@testing-library/react');

// Unmount any tree a test rendered so `document.body` starts each test clean (else
// `screen` queries would see leftovers from earlier tests in the same file). A
// no-op for tests that rendered nothing.
afterEach(() => {
  cleanup();
});
