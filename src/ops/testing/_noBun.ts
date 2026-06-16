// Loaded only on non-Bun runtimes. The `cwip/testing` export map routes the
// real module to Bun (via the "bun" export condition) and everyone else here, so
// importing these utilities outside Bun fails with a clear message instead of a
// cryptic `Cannot find module 'bun:test'`.
//
// Throwing at module top level means the error surfaces the moment the module is
// evaluated. The matching `types` condition still points at the real index.d.ts,
// so Bun users get correct types regardless of which condition their type
// resolver selects.
throw new Error(
  'cwip/testing requires the Bun runtime — it depends on `bun:test`. ' +
    'Import it only from tests run with `bun test`. ' +
    'If you are not using Bun, these mocking utilities are not available.',
);

export {};
