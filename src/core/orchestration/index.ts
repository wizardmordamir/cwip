// cwip/orchestration — the canonical agent task-runner timing taxonomy + analytics.
// Pure, browser- and node-safe (no node:*, no React). This is the SOURCE OF TRUTH
// for the categories/groups emitted by the `orchlog` recorder
// (___Agent_Workspace/orchestration/orchlog.ts) — orchlog mirrors CATEGORY_GROUPS;
// labels, grouping, chart colors, the parser, and the aggregations live here so
// every consumer (the rubato "Orchestration Processing" page, dashboards) reports
// identically.
//
//   • taxonomy   CATEGORY_GROUPS / CATEGORY_KEYS / CATEGORY_LABELS / groupOf /
//                CATEGORY_COLORS …  the shared vocabulary + stable chart hues
//   • TimingEvent + parseTimingJsonl   tolerant JSONL → typed events (never throws)
//   • aggregateByCategory / summarize  per-category stats + high-level rollups
//   • quantile / median                the math helpers behind p95/median
export * from './aggregate';
export * from './parse';
export * from './quantile';
export * from './taxonomy';
export * from './types';
