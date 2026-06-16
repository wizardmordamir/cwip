// cwip/test-report — the structured test-run report model, renderers, JUnit
// parser, fs writer (with debug-artifact materialization), and a Node-safe report
// directory reader. Runtime-agnostic except the fs reader/writer, so production
// servers can import it (unlike Bun-only `cwip/testing`, which re-exports it).
// The pure types are also published browser-safe at `cwip/test-report/types`.
export * from './parseJUnit';
export * from './read';
export * from './recorder';
export * from './render';
export * from './types';
export * from './write';
