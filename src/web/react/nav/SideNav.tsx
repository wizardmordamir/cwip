import { type ElementType, type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { AddItemsMenu } from '../components/AddItemsMenu';
import { DropIndicator } from '../components/DropIndicator';
import { useDragReorder } from '../hooks/useDragReorder';
import { cx, resolveClass, type StyleableProps } from '../styling';
import { filterNavSearch } from './filterNavSearch';
import { partitionAndOrder } from './partitionAndOrder';
import { SideNavItem, type SideNavItemProps } from './SideNavItem';
import type { NavEntry, NavPrefsActions, NavSearchItem } from './types';

export type SideNavSlot =
  | 'root'
  | 'search'
  | 'searchInput'
  | 'list'
  | 'results'
  | 'resultGroup'
  | 'resultGroupLabel'
  | 'resultItem'
  | 'footer';

export interface SideNavProps extends StyleableProps<SideNavSlot> {
  /** Eligible entries (app already filtered auth/role/enabled); `hidden`/`color`/
   *  `active` are pre-resolved. The library partitions visible/hidden + orders. */
  entries: NavEntry[];
  /** Saved order, keyed by `NavEntry.id`. */
  order: string[];
  actions: NavPrefsActions;
  collapsed?: boolean;
  /** Catalogue for the search box (top-level items + hub children). Omit = no search. */
  searchItems?: NavSearchItem[];
  searchPlaceholder?: string;
  /** Element/component for every link (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  onNavigate?: () => void;
  menuExtras?: (entry: NavEntry) => ReactNode;
  /** Per-row theming forwarded to each {@link SideNavItem} (e.g. the active slot). */
  itemClassNames?: SideNavItemProps['classNames'];
  /** Label for the restore-hidden menu (default "Show hidden"). */
  restoreLabel?: string;
  /** Accent for the drag drop-line (default emerald). */
  dropColor?: string;
}

const SEARCH_INPUT =
  'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:ring-gray-700';
const RESULT_GROUP_LABEL = 'px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400';
const RESULT_ITEM = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200';
const RESULT_ITEM_ACTIVE = 'bg-gray-100 dark:bg-gray-800';

/**
 * The full side-nav body: a search box, the drag-reorderable list of visible
 * entries (each with a kebab to recolor/hide), and a "show hidden" restore menu.
 * Controlled — the app owns prefs via `order` + `actions` and brings its own
 * routing via `linkComponent`. Typing a query swaps the list for grouped results
 * spanning hub children (Arrow/Enter/Escape navigate). The app does its own
 * eligibility filtering first; this owns hide/order + the new search/restore UX.
 */
export const SideNav = ({
  entries,
  order,
  actions,
  collapsed,
  searchItems,
  searchPlaceholder = 'Search…',
  linkComponent: Link = 'a',
  onNavigate,
  menuExtras,
  itemClassNames,
  restoreLabel = 'Show hidden',
  dropColor,
  classNames,
  unstyled,
}: SideNavProps) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const resultRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const { visible, hidden } = useMemo(() => partitionAndOrder(entries, order), [entries, order]);

  const showSearch = !collapsed && !!searchItems && searchItems.length > 0;
  const groups = useMemo(
    () => (showSearch && query.trim() ? filterNavSearch(searchItems, query) : []),
    [showSearch, searchItems, query],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const indexOfItem = useMemo(() => new Map(flat.map((it, i) => [it, i])), [flat]);
  const searching = query.trim().length > 0 && showSearch;
  const safeIndex = Math.min(activeIndex, Math.max(0, flat.length - 1));

  const { containerProps, getItemProps, getHandleProps } = useDragReorder({
    ids: visible.map((e) => e.id),
    onReorder: actions.setOrder,
  });

  const closeSearch = () => {
    setQuery('');
    setActiveIndex(0);
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      resultRefs.current[safeIndex]?.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  };

  return (
    <div className={resolveClass('flex min-h-0 grow flex-col', classNames?.root, unstyled)}>
      {showSearch && (
        <div className={resolveClass('px-2 pb-2', classNames?.search, unstyled)}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label="Search navigation"
            className={resolveClass(SEARCH_INPUT, classNames?.searchInput, unstyled)}
          />
        </div>
      )}

      {searching ? (
        <div className={resolveClass('min-h-0 grow space-y-2 overflow-y-auto px-2', classNames?.results, unstyled)}>
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No matches</p>
          ) : (
            groups.map((group) => (
              <div key={group.groupLabel ?? '__top'} className={resolveClass('', classNames?.resultGroup, unstyled)}>
                {group.groupLabel && (
                  <p className={resolveClass(RESULT_GROUP_LABEL, classNames?.resultGroupLabel, unstyled)}>
                    {group.groupLabel}
                  </p>
                )}
                {group.items.map((item) => {
                  const idx = indexOfItem.get(item) ?? 0;
                  const targetProps = Link === 'a' ? { href: item.href } : { to: item.href };
                  return (
                    <Link
                      key={`${item.id}:${item.href}`}
                      {...targetProps}
                      ref={(el: HTMLAnchorElement | null) => {
                        resultRefs.current[idx] = el;
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onNavigate?.();
                        closeSearch();
                      }}
                      className={resolveClass(
                        cx(RESULT_ITEM, idx === safeIndex && RESULT_ITEM_ACTIVE, item.hidden && 'opacity-60'),
                        classNames?.resultItem,
                        unstyled,
                      )}
                    >
                      {item.icon && <span className="shrink-0 text-base">{item.icon}</span>}
                      <span className="grow truncate">{item.label}</span>
                      {item.hidden && (
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                          hidden
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <nav
            {...containerProps}
            className={resolveClass('min-h-0 grow space-y-0.5 overflow-y-auto py-1', classNames?.list, unstyled)}
          >
            {visible.map((entry) => {
              const {
                isDragging: _isDragging,
                isOver: _isOver,
                insertBefore,
                insertAfter,
                style,
                onClickCapture,
                ...handlers
              } = getItemProps(entry.id);
              const handle = getHandleProps(entry.id);
              return (
                <div
                  key={entry.id}
                  {...handlers}
                  onClickCapture={onClickCapture}
                  onPointerDown={handle.onPointerDown}
                  style={{ ...style, ...handle.style }}
                  className="relative mx-2 rounded-lg"
                >
                  {insertBefore && <DropIndicator orientation="horizontal" side="start" color={dropColor} />}
                  {insertAfter && <DropIndicator orientation="horizontal" side="end" color={dropColor} />}
                  <SideNavItem
                    entry={entry}
                    collapsed={collapsed}
                    linkComponent={Link}
                    onNavigate={onNavigate}
                    onColor={actions.setColor}
                    onHide={actions.setHidden}
                    menuExtras={menuExtras}
                    classNames={itemClassNames}
                  />
                </div>
              );
            })}
          </nav>
          {!collapsed && hidden.length > 0 && (
            <div className={resolveClass('px-2 pt-1', classNames?.footer, unstyled)}>
              <AddItemsMenu
                items={hidden}
                onAdd={(entry) => actions.setHidden(entry, false)}
                itemKey={(entry) => entry.id}
                itemLabel={(entry) => entry.label}
                label={restoreLabel}
                showCount
                align="left"
                direction="up"
                buttonVariant="ghost"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
