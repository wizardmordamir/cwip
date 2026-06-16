import type { GridSpan, LayoutNode, LayoutTone, LayoutWidth, NodeStyle } from './types';

// All grid/style classes are written out in FULL (never concatenated) so a Tailwind
// scanner emits them — a v4 consumer must register cwip's dist as a source, the
// un-trip-able way being `@import "cwip/styles.css";` (or `@source` the WHOLE
// `cwip/dist`, NOT just `dist/react` — that omits THIS file's grid classes and
// collapses every layout node to a 1/12-width track). Everything stacks to one
// column below `sm`, then takes its real span at `sm+` (the single mobile rule).

export const WIDTH_SPAN: Record<LayoutWidth, string> = {
  full: 'col-span-12',
  half: 'col-span-12 sm:col-span-6',
  third: 'col-span-12 sm:col-span-4',
  quarter: 'col-span-6 sm:col-span-3',
};

export const SPAN_CLASS: Record<GridSpan, string> = {
  1: 'col-span-12 sm:col-span-1',
  2: 'col-span-12 sm:col-span-2',
  3: 'col-span-6 sm:col-span-3',
  4: 'col-span-12 sm:col-span-4',
  5: 'col-span-12 sm:col-span-5',
  6: 'col-span-12 sm:col-span-6',
  7: 'col-span-12 sm:col-span-7',
  8: 'col-span-12 sm:col-span-8',
  9: 'col-span-12 sm:col-span-9',
  10: 'col-span-12 sm:col-span-10',
  11: 'col-span-12 sm:col-span-11',
  12: 'col-span-12',
};

const ROW_SPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: '',
  2: 'sm:row-span-2',
  3: 'sm:row-span-3',
};

// ── Style tokens → literal classes ───────────────────────────────────────────
const TONE_SOFT_BG: Record<LayoutTone, string> = {
  neutral: 'bg-gray-100 dark:bg-gray-800/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30',
  sky: 'bg-sky-50 dark:bg-sky-900/30',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/30',
  amber: 'bg-amber-50 dark:bg-amber-900/30',
  purple: 'bg-purple-50 dark:bg-purple-900/30',
  rose: 'bg-rose-50 dark:bg-rose-900/30',
  slate: 'bg-slate-100 dark:bg-slate-800/50',
};
const TONE_SOLID_BG: Record<LayoutTone, string> = {
  neutral: 'bg-gray-200 dark:bg-gray-700',
  emerald: 'bg-emerald-100 dark:bg-emerald-800/60',
  sky: 'bg-sky-100 dark:bg-sky-800/60',
  cyan: 'bg-cyan-100 dark:bg-cyan-800/60',
  amber: 'bg-amber-100 dark:bg-amber-800/60',
  purple: 'bg-purple-100 dark:bg-purple-800/60',
  rose: 'bg-rose-100 dark:bg-rose-800/60',
  slate: 'bg-slate-200 dark:bg-slate-700',
};
const TONE_TEXT: Record<LayoutTone, string> = {
  neutral: 'text-gray-700 dark:text-gray-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  sky: 'text-sky-700 dark:text-sky-300',
  cyan: 'text-cyan-700 dark:text-cyan-300',
  amber: 'text-amber-700 dark:text-amber-300',
  purple: 'text-purple-700 dark:text-purple-300',
  rose: 'text-rose-700 dark:text-rose-300',
  slate: 'text-slate-700 dark:text-slate-300',
};

const BORDER_CLASS: Record<NonNullable<NodeStyle['border']>, string> = {
  none: '',
  hairline: 'border border-gray-200 dark:border-gray-700',
  toned: 'border border-current/20',
  strong: 'border-2 border-gray-300 dark:border-gray-600',
};
const RADIUS_CLASS: Record<NonNullable<NodeStyle['radius']>, string> = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};
const PADDING_CLASS: Record<NonNullable<NodeStyle['padding']>, string> = {
  none: '',
  tight: 'p-1.5',
  cozy: 'p-3',
  roomy: 'p-5',
};
const ALIGN_CLASS: Record<NonNullable<NodeStyle['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};
const TEXT_SIZE_CLASS: Record<NonNullable<NodeStyle['textSize']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
};
const WEIGHT_CLASS: Record<NonNullable<NodeStyle['weight']>, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};
const TEXT_COLOR_CLASS: Record<NonNullable<NodeStyle['textColor']>, string> = {
  default: 'text-gray-800 dark:text-gray-200',
  muted: 'text-gray-500 dark:text-gray-400',
  subtle: 'text-gray-400 dark:text-gray-500',
  tone: '', // resolved from style.tone below
  inherit: '',
};

const cx = (...parts: (string | false | undefined)[]): string => parts.filter(Boolean).join(' ').trim();

// The grid placement (span + row span) for a node.
export const nodeGridClass = (node: LayoutNode): string => {
  const span = node.span ? SPAN_CLASS[node.span] : WIDTH_SPAN[node.width ?? 'full'];
  return cx(span, node.rowSpan ? ROW_SPAN_CLASS[node.rowSpan] : '');
};

// The container box classes (fill/border/radius/padding) for a node's style.
export const nodeBoxClass = (style?: NodeStyle): string => {
  if (!style) return '';
  const tone = style.tone ?? 'neutral';
  let fill = '';
  if (style.fill === 'subtle') fill = 'bg-gray-50 dark:bg-gray-800/40';
  else if (style.fill === 'toned') fill = TONE_SOFT_BG[tone];
  else if (style.fill === 'solid') fill = TONE_SOLID_BG[tone];
  else if (style.fill === 'card') fill = 'bg-white shadow-sm dark:bg-gray-900';
  return cx(
    fill,
    style.border ? BORDER_CLASS[style.border] : '',
    style.radius ? RADIUS_CLASS[style.radius] : '',
    style.padding ? PADDING_CLASS[style.padding] : '',
    style.tone ? TONE_TEXT[tone] : '',
  );
};

// The text classes (size/weight/color/align) for a node's style.
export const nodeTextClass = (style?: NodeStyle): string => {
  if (!style) return '';
  const color =
    style.textColor === 'tone' && style.tone
      ? TONE_TEXT[style.tone]
      : style.textColor
        ? TEXT_COLOR_CLASS[style.textColor]
        : '';
  return cx(
    style.textSize ? TEXT_SIZE_CLASS[style.textSize] : '',
    style.weight ? WEIGHT_CLASS[style.weight] : '',
    style.align ? ALIGN_CLASS[style.align] : '',
    color,
  );
};
