// The ONE layout-config adapter, imported by both an app's server (read-path
// migration + write normalization) and UI (defensive read). It (a) upgrades a
// stored v1 `{ card/detail: { blocks[] } }` config to the v2 node tree and (b)
// normalizes any v2 config defensively (clamp widths/spans, ensure ids/bindings,
// depth-limit nesting, drop junk). It is IDEMPOTENT: migrating a v2 config returns
// an equivalent v2 config, so it can run on every read and every write safely.

import type {
  GridSpan,
  LayoutBinding,
  LayoutNode,
  LayoutTone,
  LayoutView,
  LayoutWidth,
  ListLayoutBlockV1,
  ListLayoutConfig,
  NodeStyle,
} from './types';
import { LAYOUT_TONES } from './types';

const WIDTHS: LayoutWidth[] = ['full', 'half', 'third', 'quarter'];
const BINDING_KINDS = new Set<LayoutBinding['kind']>([
  'column',
  'slot',
  'aggregate',
  'static',
  'pinnedRecord',
  'pinnedList',
  'pinnedCalendar',
]);
const MAX_DEPTH = 4; // guard against deeply/maliciously nested containers

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

const coerceWidth = (w: unknown): LayoutWidth | undefined =>
  typeof w === 'string' && (WIDTHS as string[]).includes(w) ? (w as LayoutWidth) : undefined;

const coerceSpan = (s: unknown): GridSpan | undefined => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? (n as GridSpan) : undefined;
};

const coerceTone = (t: unknown): LayoutTone | undefined =>
  typeof t === 'string' && (LAYOUT_TONES as string[]).includes(t) ? (t as LayoutTone) : undefined;

// The variant→widget-type map used when upgrading a v1 block. A blank/unknown
// variant becomes the default 'keyValue' (label + value) widget.
const VARIANT_TO_TYPE: Record<string, string> = {
  '': 'keyValue',
  title: 'title',
  subtle: 'subtitle',
  badge: 'badge',
  image: 'imageHero',
};

// A stable id derived from the column key + index, so re-reading a migrated config
// doesn't churn React keys.
const nodeId = (seed: string, index: number): string =>
  `${String(seed || 'n').replace(/[^a-zA-Z0-9_-]/g, '_')}-${index}`;

const blockToNode = (block: ListLayoutBlockV1, index: number): LayoutNode => {
  const type = VARIANT_TO_TYPE[block.variant ?? ''] ?? 'keyValue';
  const node: LayoutNode = {
    id: nodeId(block.key, index),
    type,
    binding: { kind: 'column', key: block.key },
    width: coerceWidth(block.width) ?? 'full',
  };
  if (block.hideLabel) node.hideLabel = true;
  const tone = coerceTone(block.accent);
  if (tone) node.style = { tone };
  return node;
};

const coerceBinding = (raw: unknown): LayoutBinding => {
  if (isObj(raw) && typeof raw.kind === 'string' && BINDING_KINDS.has(raw.kind as any)) {
    return raw as LayoutBinding;
  }
  return { kind: 'static' };
};

const coerceStyle = (raw: unknown): NodeStyle | undefined => {
  if (!isObj(raw)) return undefined;
  const style: NodeStyle = {};
  const tone = coerceTone(raw.tone);
  if (tone) style.tone = tone;
  // Pass the remaining enumerated tokens through untouched; the renderer's literal
  // class maps ignore any value they don't recognize, so unknown tokens are inert.
  for (const k of ['fill', 'border', 'radius', 'padding', 'textSize', 'weight', 'textColor', 'align'] as const) {
    if (typeof raw[k] === 'string') (style as any)[k] = raw[k];
  }
  return Object.keys(style).length ? style : undefined;
};

// Normalize one already-v2 node (and its children, depth-limited).
const normalizeNode = (raw: unknown, index: number, depth: number): LayoutNode | null => {
  if (!isObj(raw)) return null;
  const type = typeof raw.type === 'string' && raw.type ? raw.type : 'keyValue';
  const node: LayoutNode = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : nodeId(type, index),
    type,
    binding: coerceBinding(raw.binding),
  };

  const width = coerceWidth(raw.width);
  if (width) node.width = width;
  const span = coerceSpan(raw.span);
  if (span) node.span = span;
  const rowSpan = Number(raw.rowSpan);
  if (rowSpan === 1 || rowSpan === 2 || rowSpan === 3) node.rowSpan = rowSpan;

  if (raw.hideLabel) node.hideLabel = true;
  if (typeof raw.variant === 'string' && raw.variant) node.variant = raw.variant;
  if (typeof raw.emptyFallback === 'string') node.emptyFallback = raw.emptyFallback;
  if (typeof raw.content === 'string') node.content = raw.content;
  const style = coerceStyle(raw.style);
  if (style) node.style = style;
  if (isObj(raw.config)) node.config = raw.config;

  // container-only fields
  if (typeof raw.title === 'string') node.title = raw.title;
  if (raw.collapsible) node.collapsible = true;
  if (raw.columns === 1 || raw.columns === 2 || raw.columns === 3 || raw.columns === 4) {
    node.columns = raw.columns;
  }
  if (Array.isArray(raw.children) && depth < MAX_DEPTH) {
    node.children = raw.children
      .map((c, i) => normalizeNode(c, i, depth + 1))
      .filter((c): c is LayoutNode => c !== null);
  }
  return node;
};

// Migrate/normalize one view. A view with `nodes` is treated as v2; a view with
// `blocks` is upgraded from v1; anything else is an empty disabled view.
export const migrateLayoutView = (raw: unknown): LayoutView => {
  if (!isObj(raw)) return { enabled: false, nodes: [] };
  if (Array.isArray(raw.nodes)) {
    return {
      enabled: Boolean(raw.enabled),
      nodes: raw.nodes.map((n, i) => normalizeNode(n, i, 0)).filter((n): n is LayoutNode => n !== null),
    };
  }
  if (Array.isArray(raw.blocks)) {
    return {
      enabled: Boolean(raw.enabled),
      nodes: (raw.blocks as any[])
        .filter((b) => isObj(b) && typeof b.key === 'string' && b.key)
        .map((b, i) => blockToNode(b as ListLayoutBlockV1, i)),
    };
  }
  return { enabled: false, nodes: [] };
};

// Migrate/normalize a whole stored layout config (v1 or v2) into v2. Only the views
// that exist in the source are emitted (an empty list stays `{ version: 2 }`).
export const migrateLayoutConfig = (raw: unknown): ListLayoutConfig => {
  const cfg: ListLayoutConfig = { version: 2 };
  if (!isObj(raw)) return cfg;
  if (isObj(raw.card) || Array.isArray((raw.card as any)?.blocks)) {
    cfg.card = migrateLayoutView(raw.card);
  }
  if (isObj(raw.detail) || Array.isArray((raw.detail as any)?.blocks)) {
    cfg.detail = migrateLayoutView(raw.detail);
  }
  if (isObj(raw.dashboard)) {
    cfg.dashboard = migrateLayoutView(raw.dashboard);
  }
  return cfg;
};
