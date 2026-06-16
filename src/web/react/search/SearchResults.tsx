import type { ElementType, ReactNode } from 'react';
import { resolveClass, type StyleableProps } from '../styling';

/** One result row. `href` is given to `linkComponent` as `to` (router) or `href` (`<a>`). */
export interface SearchResultRow {
  /** Stable React key + identity. */
  id: string;
  href: string;
  title: string;
  /** Why it matched — shown under the title (build with `cwip/search` snippets). */
  snippet?: string;
  /** Secondary right-aligned meta (a date, a parent name). */
  sub?: string;
  /** A trailing tag node (e.g. a kind / archived badge). */
  badge?: ReactNode;
  /** Leading icon node. */
  icon?: ReactNode;
}

/** A titled group of rows (one per searched entity type). */
export interface SearchResultGroup {
  /** Stable key for this group. */
  key: string;
  label: string;
  icon?: ReactNode;
  items: SearchResultRow[];
}

export type SearchResultsSlot =
  | 'root'
  | 'group'
  | 'groupHeader'
  | 'count'
  | 'list'
  | 'item'
  | 'itemBody'
  | 'itemTitleRow'
  | 'itemTitle'
  | 'snippet'
  | 'sub';

export interface SearchResultsProps extends StyleableProps<SearchResultsSlot> {
  /** Grouped results; empty groups are skipped. */
  groups: SearchResultGroup[];
  /** Element/component for each result link (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  /** Called when a result is clicked (e.g. close a dropdown / a mobile drawer). */
  onNavigate?: () => void;
  /** Rendered when there are no results at all. Omit to render nothing. */
  emptyContent?: ReactNode;
}

const GROUP_HEADER = 'mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300';
const COUNT =
  'rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400';
const ITEM =
  'flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50';
const ITEM_TITLE = 'truncate text-sm text-gray-900 dark:text-gray-100';
const SNIPPET = 'truncate text-xs text-gray-500 dark:text-gray-400';
const SUB = 'shrink-0 truncate text-xs text-gray-400';

/**
 * A routing-agnostic, themeable renderer for grouped content-search results — the
 * shared presentation behind each app's universal search (a full-page list, or a
 * header dropdown). The app does the searching (server + `cwip/search` helpers) and
 * maps hits to {@link SearchResultGroup}s; this draws them. Bring routing via
 * `linkComponent` and restyle any slot via `classNames`/`styles`/`unstyled`.
 */
export const SearchResults = ({
  groups,
  linkComponent: Link = 'a',
  onNavigate,
  emptyContent,
  classNames,
  unstyled,
}: SearchResultsProps) => {
  const nonEmpty = groups.filter((g) => g.items.length > 0);
  if (nonEmpty.length === 0) return emptyContent ? emptyContent : null;

  return (
    <div className={resolveClass('flex flex-col gap-6', classNames?.root, unstyled)}>
      {nonEmpty.map((group) => (
        <div key={group.key} className={resolveClass('', classNames?.group, unstyled)}>
          <div className={resolveClass(GROUP_HEADER, classNames?.groupHeader, unstyled)}>
            {group.icon}
            {group.label}
            <span className={resolveClass(COUNT, classNames?.count, unstyled)}>{group.items.length}</span>
          </div>
          <div className={resolveClass('flex flex-col gap-1.5', classNames?.list, unstyled)}>
            {group.items.map((item) => {
              const targetProps = Link === 'a' ? { href: item.href } : { to: item.href };
              return (
                <Link
                  key={item.id}
                  {...targetProps}
                  onClick={onNavigate}
                  className={resolveClass(ITEM, classNames?.item, unstyled)}
                >
                  <span className={resolveClass('flex min-w-0 flex-col gap-0.5', classNames?.itemBody, unstyled)}>
                    <span
                      className={resolveClass('flex min-w-0 items-center gap-2', classNames?.itemTitleRow, unstyled)}
                    >
                      {item.icon}
                      <span className={resolveClass(ITEM_TITLE, classNames?.itemTitle, unstyled)}>{item.title}</span>
                      {item.badge}
                    </span>
                    {item.snippet && (
                      <span className={resolveClass(SNIPPET, classNames?.snippet, unstyled)}>{item.snippet}</span>
                    )}
                  </span>
                  {item.sub && <span className={resolveClass(SUB, classNames?.sub, unstyled)}>{item.sub}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
