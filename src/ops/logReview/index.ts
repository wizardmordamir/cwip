// cwip/log-review — a framework-agnostic analyzer for recurring, INCREMENTAL
// request/server-log review.
//
// The consuming app persists a watermark and fetches only the rows newer than it
// (never a full-table scan), then hands that window to `reviewLogs`, which returns
// structured bottleneck / error-spike / host-anomaly findings with stable dedupe
// keys. `findingToTaskDraft` turns a finding into an idempotent follow-up task
// draft. No DB, clock, framework, or logger coupling lives here — that is the
// app's job; this is the one shared source of "what counts, and how we phrase it".
export * from './analyze';
export * from './findingToTask';
export * from './thresholds';
export * from './types';
