import type { ElementType, ReactNode } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';

// A themeable, routing-agnostic breadcrumb trail — the shared "where am I, and how
// do I climb back out" affordance. Like the rest of the nav toolkit it stays
// agnostic to each app's router (`linkComponent`), prefs, and theming (per-slot
// class/style overrides). The app computes the trail (usually with
// `buildBreadcrumbTrail` below, from its own route hierarchy) and hands it in; the
// component just renders it. The LAST crumb is always the current page — rendered
// as non-interactive `aria-current="page"` regardless of whether it carries an
// `href` — so callers can hand the same `{label, href}` shape for every crumb.

/** One rendered crumb in a trail. */
export interface BreadcrumbItem {
  /** Visible label. */
  label: string;
  /** Link target. The trail's LAST item is the current page and is rendered
   *  non-interactive regardless of `href`. */
  href?: string;
  /** Optional leading glyph (e.g. a home icon on the root crumb). */
  icon?: ReactNode;
  /** Stable React key; defaults to `href ?? label` when omitted. */
  key?: string;
}

/**
 * One node in a route hierarchy, used by {@link buildBreadcrumbTrail}. Each node
 * declares its parent's `key`, so the trail is assembled by walking parent links
 * from the current node up to a root — the hierarchy need NOT mirror URL nesting
 * (e.g. `/contacts` can sit under a `/people` hub it doesn't share a path prefix
 * with).
 */
export interface BreadcrumbNode {
  /** Stable key — typically the route path/pattern. Parents reference this. */
  key: string;
  label: string;
  /** Concrete link target. Defaults to `key` when omitted. */
  href?: string;
  /** Parent node's `key`. Omit for a root. */
  parent?: string;
  icon?: ReactNode;
}

export interface BuildTrailOptions {
  /** Override the leaf (current) crumb's label — e.g. a record's display name. */
  leafLabel?: string;
  /** Override the leaf crumb's href (defaults to the node's `href`/`key`). */
  leafHref?: string;
  /** Safety cap on the ancestor walk — guards against a cyclic/long parent map. */
  maxDepth?: number;
}

/**
 * Walk a route hierarchy from `currentKey` up through `parent` links and return the
 * crumbs root→leaf. `nodes` may be a keyed record or an array (indexed by `key`).
 * Returns `[]` when `currentKey` isn't found, so an unmapped route simply shows no
 * breadcrumbs rather than throwing. Cycles and runaway chains are bounded by
 * `maxDepth`.
 */
export function buildBreadcrumbTrail(
  nodes: Record<string, BreadcrumbNode> | BreadcrumbNode[],
  currentKey: string,
  options: BuildTrailOptions = {},
): BreadcrumbItem[] {
  const index: Record<string, BreadcrumbNode> = Array.isArray(nodes)
    ? Object.fromEntries(nodes.map((n) => [n.key, n]))
    : nodes;
  const { leafLabel, leafHref, maxDepth = 25 } = options;

  const chain: BreadcrumbNode[] = [];
  const seen = new Set<string>();
  let key: string | undefined = currentKey;
  let depth = 0;
  while (key && depth < maxDepth) {
    const node = index[key];
    if (!node || seen.has(key)) break;
    seen.add(key);
    chain.push(node);
    key = node.parent;
    depth += 1;
  }
  chain.reverse(); // root → leaf

  return chain.map((node, i) => {
    const isLeaf = i === chain.length - 1;
    return {
      key: node.key,
      label: isLeaf && leafLabel != null ? leafLabel : node.label,
      href: isLeaf && leafHref !== undefined ? leafHref : (node.href ?? node.key),
      icon: node.icon,
    };
  });
}

export type BreadcrumbsSlot =
  | 'root' // the <nav> wrapper
  | 'list' // the <ol>
  | 'item' // each <li>
  | 'link' // an interactive ancestor crumb
  | 'current' // the final, current-page crumb
  | 'separator'
  | 'icon'
  | 'ellipsis'; // the collapsed-middle marker

export interface BreadcrumbsProps extends StyleableProps<BreadcrumbsSlot> {
  /** The trail, root→leaf. The last item is the current page (non-interactive). */
  items: BreadcrumbItem[];
  /** Element/component for ancestor links (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  /** Fired when an ancestor crumb is activated (e.g. close a mobile drawer). */
  onNavigate?: () => void;
  /** Separator between crumbs (default a chevron `›`). */
  separator?: ReactNode;
  /** Accessible name for the <nav>. Default `'Breadcrumb'`. */
  ariaLabel?: string;
  /** Shortcut for the `root` slot class. */
  className?: string;
  /**
   * Collapse long trails to `first … last N`. When set and `items.length`
   * exceeds it, the middle crumbs fold into an ellipsis (their labels surface as
   * the ellipsis `title`). Omit/0 to never collapse.
   */
  maxItems?: number;
  /** Crumbs kept at the tail when collapsing (default 2; min 1). */
  collapseTail?: number;
}

const ROOT_DEFAULT = 'flex min-w-0 items-center text-sm';
const LIST_DEFAULT = 'flex min-w-0 flex-wrap items-center gap-1';
const ITEM_DEFAULT = 'flex min-w-0 items-center gap-1';
const LINK_DEFAULT =
  'max-w-[12rem] truncate rounded text-gray-500 transition-colors hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-100';
const CURRENT_DEFAULT = 'max-w-[16rem] truncate font-medium text-gray-900 dark:text-gray-100';
const SEPARATOR_DEFAULT = 'select-none px-0.5 text-gray-300 dark:text-gray-600';
const ELLIPSIS_DEFAULT = 'select-none px-0.5 text-gray-400 dark:text-gray-500';

type Rendered =
  | { kind: 'crumb'; item: BreadcrumbItem; isLast: boolean }
  | { kind: 'ellipsis'; hidden: BreadcrumbItem[] };

/** Build the visible sequence, folding the middle into an ellipsis when collapsing. */
const collapseItems = (items: BreadcrumbItem[], maxItems?: number, collapseTail = 2): Rendered[] => {
  const lastIndex = items.length - 1;
  const tail = Math.max(1, collapseTail);
  if (!maxItems || items.length <= maxItems || items.length <= tail + 1) {
    return items.map((item, i) => ({ kind: 'crumb', item, isLast: i === lastIndex }));
  }
  const head = items[0];
  const hidden = items.slice(1, items.length - tail);
  const tailItems = items.slice(items.length - tail);
  return [
    { kind: 'crumb', item: head, isLast: false },
    { kind: 'ellipsis', hidden },
    ...tailItems.map((item, i) => ({ kind: 'crumb' as const, item, isLast: i === tailItems.length - 1 })),
  ];
};

/**
 * A breadcrumb trail: every crumb but the last is a link to that ancestor; the last
 * is the current page (`aria-current="page"`, non-interactive). Themeable per slot;
 * collapses an over-long middle to an ellipsis. Renders nothing for an empty trail.
 */
export const Breadcrumbs = ({
  items,
  linkComponent: Link = 'a',
  onNavigate,
  separator = '›',
  ariaLabel = 'Breadcrumb',
  className,
  maxItems,
  collapseTail,
  classNames,
  styles,
  unstyled,
}: BreadcrumbsProps) => {
  if (!items.length) return null;

  const rootClass = resolveClass(ROOT_DEFAULT, classNames?.root ?? className, unstyled);
  const listClass = resolveClass(LIST_DEFAULT, classNames?.list, unstyled);
  const itemClass = resolveClass(ITEM_DEFAULT, classNames?.item, unstyled);
  const linkClass = resolveClass(LINK_DEFAULT, classNames?.link, unstyled);
  const currentClass = resolveClass(CURRENT_DEFAULT, classNames?.current, unstyled);
  const sepClass = resolveClass(SEPARATOR_DEFAULT, classNames?.separator, unstyled);
  const ellipsisClass = resolveClass(ELLIPSIS_DEFAULT, classNames?.ellipsis, unstyled);
  const iconClass = resolveClass('shrink-0', classNames?.icon, unstyled);

  const rootStyle = resolveStyle({}, styles?.root, unstyled);
  const listStyle = resolveStyle({}, styles?.list, unstyled);
  const itemStyle = resolveStyle({}, styles?.item, unstyled);
  const linkStyle = resolveStyle({}, styles?.link, unstyled);
  const currentStyle = resolveStyle({}, styles?.current, unstyled);
  const sepStyle = resolveStyle({}, styles?.separator, unstyled);
  const ellipsisStyle = resolveStyle({}, styles?.ellipsis, unstyled);
  const iconStyle = resolveStyle({}, styles?.icon, unstyled);

  const sequence = collapseItems(items, maxItems, collapseTail);

  return (
    <nav aria-label={ariaLabel} className={rootClass} style={rootStyle}>
      <ol className={listClass} style={listStyle}>
        {sequence.map((node, i) => {
          const sep =
            i > 0 ? (
              <span aria-hidden="true" className={sepClass} style={sepStyle}>
                {separator}
              </span>
            ) : null;

          if (node.kind === 'ellipsis') {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: the ellipsis is a single stable slot in the sequence
              <li key={`ellipsis-${i}`} className={itemClass} style={itemStyle}>
                {sep}
                <span
                  className={ellipsisClass}
                  title={node.hidden.map((h) => h.label).join(' › ')}
                  style={ellipsisStyle}
                >
                  …
                </span>
              </li>
            );
          }

          const { item, isLast } = node;
          const icon = item.icon ? (
            <span className={iconClass} style={iconStyle}>
              {item.icon}
            </span>
          ) : null;

          return (
            <li key={item.key ?? item.href ?? item.label} className={itemClass} style={itemStyle}>
              {sep}
              {isLast || !item.href ? (
                <span className={currentClass} aria-current={isLast ? 'page' : undefined} style={currentStyle}>
                  {icon}
                  {item.label}
                </span>
              ) : (
                <Link
                  {...(Link === 'a' ? { href: item.href } : { to: item.href })}
                  onClick={onNavigate}
                  className={linkClass}
                  style={linkStyle}
                >
                  {icon}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
