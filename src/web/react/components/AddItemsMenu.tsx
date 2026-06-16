import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { Button, type ButtonSize, type ButtonVariant } from './Button';
import { computePopoverPlacement, type PopoverDirection, type PopoverPlacement } from './popoverPlacement';

// useLayoutEffect warns (and never runs) on the server; alias it to useEffect there
// so SSR (e.g. renderToStaticMarkup in tests) stays quiet, while the client still
// measures before paint — the popover never flashes open downward then jumps up.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** A labelled section of addable items (e.g. "Widgets" / "Lists" / "Pages"). */
export interface AddItemsGroup<T> {
  /** Section heading; omit for an ungrouped flat list. */
  label?: string;
  items: T[];
}

export type AddItemsMenuSlot = 'root' | 'trigger' | 'backdrop' | 'popover' | 'group' | 'groupLabel' | 'item';

export interface AddItemsMenuProps<T> extends StyleableProps<AddItemsMenuSlot> {
  /** Flat list of addable items. Use `groups` instead for sectioned lists. */
  items?: T[];
  /** Sectioned addable items; takes precedence over `items`. */
  groups?: AddItemsGroup<T>[];
  /** Called with the chosen item; the popover closes afterward. */
  onAdd: (item: T) => void;
  /** Stable id for an item (React key). */
  itemKey: (item: T) => string;
  /** Primary label for an item row. */
  itemLabel: (item: T) => ReactNode;
  /** Optional secondary line under the label. */
  itemDescription?: (item: T) => ReactNode;
  /** Trigger button text (default "Add"). */
  label?: string;
  /** Append the available-count to the label, e.g. "Add section (3)". */
  showCount?: boolean;
  /** Leading glyph/icon on the trigger (default "+"). */
  icon?: ReactNode;
  /** cwip Button variant for the trigger (default "default"). */
  buttonVariant?: ButtonVariant;
  /** cwip Button size for the trigger (default "sm"). */
  buttonSize?: ButtonSize;
  /** Popover horizontal alignment relative to the trigger (default "right"). */
  align?: 'left' | 'right';
  /** Vertical direction the popover opens. `'auto'` (default) measures the room
   *  above vs. below the trigger on open and flips upward when a downward popover
   *  would run off-screen — important when the trigger sits near the bottom of the
   *  viewport (e.g. the side-nav "Show hidden" footer). `'down'`/`'up'` force it.
   *  Either way the popover's max height is clamped to the room on the chosen side
   *  so the full list stays scrollable within the viewport. */
  direction?: PopoverDirection;
  /** Shown when there are no items (default "Nothing to add"). */
  emptyLabel?: string;
  disabled?: boolean;
}

// Vertical offset + max height are resolved at open time from the measured room
// around the trigger (see computePopoverPlacement); the base omits both.
const POPOVER_CLASS =
  'absolute z-40 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900';
const GROUP_LABEL_CLASS =
  'border-t border-gray-100 px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 first:border-t-0 dark:border-gray-800';
const ITEM_CLASS = 'block w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800';

/**
 * The "+ {label}" button + popover that lists addable items — the shared UI for
 * bringing hidden/available items back (dashboard widgets, hub sections, layout
 * blocks, hidden template entries). Pairs with {@link DismissButton} ("✕") and
 * {@link useDismissibleItems}. Tailwind-first; overridable per slot. The label
 * defaults to "Add" and is meant to be set per use ("Add widget", "Add section",
 * "Show hidden", …).
 */
export function AddItemsMenu<T>({
  items,
  groups,
  onAdd,
  itemKey,
  itemLabel,
  itemDescription,
  label = 'Add',
  showCount = false,
  icon = '+',
  buttonVariant = 'default',
  buttonSize = 'sm',
  align = 'right',
  direction = 'auto',
  emptyLabel = 'Nothing to add',
  disabled = false,
  classNames,
  styles,
  unstyled,
}: AddItemsMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const sections: AddItemsGroup<T>[] = groups ?? [{ items: items ?? [] }];
  const count = sections.reduce((n, g) => n + g.items.length, 0);
  useEscapeKey(() => setOpen(false), open);

  // Measure the room around the trigger when the popover opens so it flips up (or
  // stays down) and caps its height to never run off-screen.
  useIsoLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    setPlacement(
      computePopoverPlacement({
        triggerRect: el.getBoundingClientRect(),
        viewportHeight: window.innerHeight,
        direction,
      }),
    );
  }, [open, direction]);

  const choose = (item: T) => {
    onAdd(item);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={resolveClass('relative', classNames?.root, unstyled)}
      style={resolveStyle({}, styles?.root, unstyled)}
    >
      <Button
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={typeof classNames?.trigger === 'string' ? classNames.trigger : undefined}
      >
        {icon}
        <span>
          {label}
          {showCount ? ` (${count})` : ''}
        </span>
      </Button>
      {open && (
        <>
          {/* Click-away backdrop. */}
          <button
            type="button"
            aria-label="Close"
            className={resolveClass('fixed inset-0 z-30 cursor-default', classNames?.backdrop, unstyled)}
            onClick={() => setOpen(false)}
          />
          <div
            className={resolveClass(
              `${POPOVER_CLASS} ${align === 'right' ? 'right-0' : 'left-0'} ${
                placement?.dir === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
              }`,
              classNames?.popover,
              unstyled,
            )}
            style={resolveStyle(placement ? { maxHeight: placement.maxHeight } : {}, styles?.popover, unstyled)}
          >
            {count === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
            ) : (
              sections.map((group, gi) => {
                if (group.items.length === 0) return null;
                return (
                  <div key={group.label ?? `g${gi}`} className={resolveClass('', classNames?.group, unstyled)}>
                    {group.label && (
                      <p className={resolveClass(GROUP_LABEL_CLASS, classNames?.groupLabel, unstyled)}>{group.label}</p>
                    )}
                    {group.items.map((item) => {
                      const desc = itemDescription?.(item);
                      return (
                        <button
                          key={itemKey(item)}
                          type="button"
                          onClick={() => choose(item)}
                          className={resolveClass(ITEM_CLASS, classNames?.item, unstyled)}
                        >
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            {itemLabel(item)}
                          </span>
                          {desc != null && desc !== '' && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
