import type { CategoryKey, GroupKey } from './taxonomy';

// One parsed JSONL line emitted by the orchlog recorder. Field shape mirrors
// orchlog's `emit()` line EXACTLY. `category` is coerced to a known key on parse
// (unknown → 'other'); `group` is the category's group.
export type TimingEventKind = 'phase' | 'run' | 'mark' | 'task';

export type TimingEvent = {
  // Schema tag, e.g. "orchlog/v1".
  schema: string;
  // Stable per-event id, e.g. "<session>:0007".
  event_id: string;
  // Stable per-task session id, e.g. "W1-1718000000000".
  session: string;
  // Worker key (drain sets ORCHLOG_WORKER; "local" for interactive runs).
  worker: string;
  // Task slug (or "adhoc").
  task_id: string;
  // Human task title.
  task_title: string;
  // Canonical repo name (cursedalchemy | rubato | cwip | …).
  repo: string;
  // Category key (coerced to a known CategoryKey; unknown → 'other').
  category: CategoryKey;
  // The category's group.
  group: GroupKey;
  // How the event was captured.
  kind: TimingEventKind;
  // The wrapped command (kind:'run' only).
  command?: string;
  // The wrapped command's exit code (kind:'run' only).
  exit_code?: number;
  // exit_code == null ? true : exit_code === 0.
  ok: boolean;
  // Free-text note (residual marker, task total, manual marks).
  note?: string;
  // ISO start timestamp.
  start: string;
  // ISO end timestamp.
  end: string;
  // Event duration in ms (>= 0).
  duration_ms: number;
  // Epoch ms of the event end (sort key).
  ts: number;
};
