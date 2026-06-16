// The v2 layout/widget engine data model — the single source of truth shared by an
// app's server (read-path migration + write validation) and UI (rendering +
// editing), and across apps via cwip. Pure data types with NO runtime deps, so a
// bun-server and a browser bundle import the exact same definitions (no drift).
//
// A layout is a tree of `LayoutNode`s rendered onto a responsive 12-col grid. Each
// node's `type` is a widget-registry key (the app supplies the registry) and each
// node carries a `binding` (its data source). The same model powers list
// cards/detail/dashboards and standalone custom pages (the `pinned*` bindings).

export type LayoutWidth = 'full' | 'half' | 'third' | 'quarter';
export type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Soft accent palette — kept as a plain string union so this stays dependency-free
// (a renderer casts to its own Badge/tone system).
export type LayoutTone = 'neutral' | 'emerald' | 'sky' | 'cyan' | 'amber' | 'purple' | 'rose' | 'slate';

export const LAYOUT_TONES: LayoutTone[] = ['neutral', 'emerald', 'sky', 'cyan', 'amber', 'purple', 'rose', 'slate'];

// A metric computed over the visible row set (list-level dashboard widgets).
export type AggregateMetric = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countTrue' | 'distinctCount' | 'progress';

// The pluggable data source for a node. 'column' binds the ambient row's column;
// 'slot' is a saved-design placeholder resolved when the design is applied;
// 'aggregate' is computed over the visible rows; 'static' is decorative. The
// pinned* kinds bind to another resource (records/lists/calendars) for custom
// pages. Apps may extend this union with their own kinds via the resolver seam.
export type LayoutBinding =
  | { kind: 'column'; key: string }
  | { kind: 'slot'; slotId: string }
  | { kind: 'aggregate'; metric: AggregateMetric; key?: string }
  | { kind: 'static' }
  | { kind: 'pinnedRecord'; listId: string; rowId: string; key?: string }
  | { kind: 'pinnedList'; listId: string; metric?: AggregateMetric; key?: string }
  | { kind: 'pinnedCalendar'; calendarId: string };

export type LayoutBindingKind = LayoutBinding['kind'];

// Enumerated style tokens (NOT arbitrary CSS) → literal Tailwind classes at render,
// so styling stays safe + themeable.
export type NodeStyle = {
  tone?: LayoutTone;
  fill?: 'none' | 'subtle' | 'toned' | 'solid' | 'card';
  border?: 'none' | 'hairline' | 'toned' | 'strong';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  padding?: 'none' | 'tight' | 'cozy' | 'roomy';
  textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textColor?: 'default' | 'muted' | 'subtle' | 'tone' | 'inherit';
  align?: 'left' | 'center' | 'right';
};

// A single layout node. `type` is the widget-registry key (e.g. 'title', 'badge',
// 'section'); `binding` is always present (decorative nodes use { kind: 'static' }).
// Container nodes ('section' | 'group') nest `children`.
export type LayoutNode = {
  id: string;
  type: string;
  binding: LayoutBinding;
  width?: LayoutWidth;
  span?: GridSpan; // raw 1–12 span; wins over `width` when set
  rowSpan?: 1 | 2 | 3;
  hideLabel?: boolean;
  variant?: string; // widget-specific display variant
  emptyFallback?: string; // text shown when the resolved value is empty
  style?: NodeStyle;
  config?: Record<string, unknown>; // widget-specific options
  content?: string; // literal text for decoration widgets (heading/text)
  // container-only:
  title?: string;
  collapsible?: boolean;
  columns?: 1 | 2 | 3 | 4;
  children?: LayoutNode[];
};

// The surfaces a layout config can design. `card` = each row as a designed card;
// `detail` = a single record's full view; `dashboard` = list-level overview
// widgets; `page` = a standalone custom page.
export type LayoutSurface = 'card' | 'detail' | 'dashboard' | 'page';

export type LayoutView = {
  enabled?: boolean; // when off, fall back to the default table
  nodes: LayoutNode[];
};

export type ListLayoutConfig = {
  version: 2;
  card?: LayoutView;
  detail?: LayoutView;
  dashboard?: LayoutView;
};

// ── Saved reusable designs ────────────────────────────────────────────────────
// A design is abstracted from any one list: its field nodes bind to slots, and a
// slot is mapped to a concrete column when the design is applied to a list.
export type SlotRole =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'media'
  | 'badge'
  | 'meta'
  | 'metric'
  | 'date'
  | 'status'
  | 'rating'
  | 'flag'
  | 'identity'
  | 'tags'
  | 'link'
  | 'color';

export type DesignSlot = {
  id: string;
  label: string;
  role: SlotRole;
  acceptTypes: string[]; // column types that can fill this slot
  required?: boolean;
  fallback?: 'hide' | 'firstOfType';
};

// ── Legacy v1 shape (migration INPUT only) ───────────────────────────────────
// The original flat block model. Read-path migration upgrades stored v1 configs to
// v2; nothing writes v1 anymore.
export type ListLayoutBlockV1 = {
  key: string;
  width: LayoutWidth;
  variant?: string;
  accent?: string;
  hideLabel?: boolean;
};
export type ListLayoutViewV1 = { enabled?: boolean; blocks: ListLayoutBlockV1[] };
export type ListLayoutConfigV1 = { card?: ListLayoutViewV1; detail?: ListLayoutViewV1 };
