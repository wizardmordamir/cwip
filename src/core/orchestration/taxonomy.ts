// The canonical agent task-runner timing taxonomy. This is the SOURCE OF TRUTH for
// the categories/groups emitted by the `orchlog` recorder
// (___Agent_Workspace/orchestration/orchlog.ts) — keep the two in sync. orchlog
// mirrors CATEGORY_GROUPS (stable keys); the human labels, grouping helpers, and
// chart colors live here so every consumer reports identically.

// group → ordered category keys. Mirrors orchlog's CATEGORY_GROUPS EXACTLY.
export const CATEGORY_GROUPS = {
  setup: ['deps-install', 'worktree-setup'],
  cognitive: ['planning', 'implementation', 'review-cleanup'],
  verify: ['typecheck', 'lint', 'build', 'unit-test', 'functional-test', 'e2e-test'],
  integration: ['conflict-resolution', 'landing'],
  meta: ['task-admin', 'documentation', 'other'],
} as const;

export type GroupKey = keyof typeof CATEGORY_GROUPS;
export type CategoryKey = (typeof CATEGORY_GROUPS)[GroupKey][number];

// Flat, ordered list of every category key (group order, then in-group order).
export const CATEGORY_KEYS: CategoryKey[] = Object.values(CATEGORY_GROUPS).flat() as CategoryKey[];

// Ordered list of group keys.
export const GROUP_KEYS: GroupKey[] = Object.keys(CATEGORY_GROUPS) as GroupKey[];

const CATEGORY_SET = new Set<string>(CATEGORY_KEYS);

// True when `cat` is a known category key.
export const isCategoryKey = (cat: string): cat is CategoryKey => CATEGORY_SET.has(cat);

// The group a category belongs to (falls back to 'meta' for unknown input, matching
// orchlog's groupOf).
export const groupOf = (category: string): GroupKey => {
  for (const g of GROUP_KEYS) {
    if ((CATEGORY_GROUPS[g] as readonly string[]).includes(category)) return g;
  }
  return 'meta';
};

// Human-readable labels for each category key.
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  'deps-install': 'Dependency install',
  'worktree-setup': 'Worktree setup',
  planning: 'Planning',
  implementation: 'Implementation',
  'review-cleanup': 'Review & cleanup',
  typecheck: 'Typecheck',
  lint: 'Lint',
  build: 'Build',
  'unit-test': 'Unit tests',
  'functional-test': 'Functional tests',
  'e2e-test': 'E2E tests',
  'conflict-resolution': 'Conflict resolution',
  landing: 'Landing',
  'task-admin': 'Task admin',
  documentation: 'Documentation',
  other: 'Other',
};

// Human-readable labels for each group key.
export const CATEGORY_GROUP_LABELS: Record<GroupKey, string> = {
  setup: 'Setup',
  cognitive: 'Cognitive',
  verify: 'Verify',
  integration: 'Integration',
  meta: 'Meta',
};

// The label for a category, falling back to the raw key for unknown input.
export const labelForCategory = (category: string): string =>
  isCategoryKey(category) ? CATEGORY_LABELS[category] : category;

// Stable hex color per category, grouped by hue family (so a chart reads as "this
// slice is setup-ish / verify-ish" at a glance):
//   setup       → slate/blue-grey
//   cognitive   → emerald/teal/green (the work)
//   verify      → amber→orange→red ramp (the gate)
//   integration → violet/purple
//   meta        → grey/neutral
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  // setup — cool slate-blue
  'deps-install': '#64748b',
  'worktree-setup': '#94a3b8',
  // cognitive — green family
  planning: '#10b981',
  implementation: '#059669',
  'review-cleanup': '#14b8a6',
  // verify — warm gate ramp
  typecheck: '#fbbf24',
  lint: '#f59e0b',
  build: '#f97316',
  'unit-test': '#ef4444',
  'functional-test': '#dc2626',
  'e2e-test': '#b91c1c',
  // integration — violet
  'conflict-resolution': '#8b5cf6',
  landing: '#6366f1',
  // meta — neutral
  'task-admin': '#a1a1aa',
  documentation: '#71717a',
  other: '#52525b',
};

// The color for a category, falling back to the 'other' grey for unknown input.
export const colorForCategory = (category: string): string =>
  isCategoryKey(category) ? CATEGORY_COLORS[category] : CATEGORY_COLORS.other;
