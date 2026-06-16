import { type CSSProperties, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { FIELD_CLASS_AUTO } from './field';
import { computePopoverPlacement, type PopoverDirection, type PopoverPlacement } from './popoverPlacement';

// useLayoutEffect warns (and never runs) on the server; alias it to useEffect there
// so SSR stays quiet, while the client still measures before paint.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** One selectable option in a {@link Dropdown}. */
export interface DropdownOption<T extends string = string> {
  /** The value committed via `onChange` when chosen. */
  value: T;
  /** What the row (and, when selected, the trigger) shows. */
  label: ReactNode;
  /** Optional secondary line under the label in the open list. */
  description?: ReactNode;
  /** Greyed-out and unselectable (skipped by keyboard navigation). */
  disabled?: boolean;
}

export type DropdownSlot = 'root' | 'trigger' | 'caret' | 'backdrop' | 'popover' | 'option';

export interface DropdownProps<T extends string = string> extends StyleableProps<DropdownSlot> {
  /** The choices, in display order. */
  options: DropdownOption<T>[];
  /** The currently-selected value (`null`/`undefined` shows the placeholder). */
  value: T | null | undefined;
  /** Called with the chosen value; the list closes afterward. */
  onChange: (value: T) => void;
  /** Trigger text when nothing is selected (default "Select…"). */
  placeholder?: ReactNode;
  /** Popover horizontal alignment relative to the trigger (default "left"). */
  align?: 'left' | 'right';
  /** Vertical direction the popover opens (default "auto" — flips up near the
   *  viewport bottom and clamps its height so the list stays scrollable). */
  direction?: PopoverDirection;
  disabled?: boolean;
  /** Accessible name for the trigger (use when there's no visible label). */
  'aria-label'?: string;
  id?: string;
  /** Shortcut for `classNames.trigger` (the closed control). */
  className?: string;
  /** Shortcut for `styles.trigger`. */
  style?: CSSProperties;
}

// Visual defaults mirror Select / AddItemsMenu so a Dropdown sits naturally next to
// the other field controls. The trigger reuses the shared field look; the popover
// reuses the AddItemsMenu surface. Positioning (offset/maxHeight) is resolved at
// open time from the measured room around the trigger.
const TRIGGER_CLASS = `${FIELD_CLASS_AUTO} inline-flex cursor-pointer items-center justify-between gap-2 text-left`;
const POPOVER_CLASS =
  'absolute z-40 min-w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900';
const OPTION_BASE = 'block w-full cursor-pointer px-3 py-2 text-left text-sm';

/**
 * Pick the next enabled option index in `options` starting from `from`, stepping
 * by `dir` (+1 down / -1 up) and wrapping at the ends. Disabled options are
 * skipped. Returns `from` when there is no other enabled option (so a single-choice
 * list doesn't jump), or `-1` when the list is empty / all-disabled. Pure +
 * testable so the keyboard wiring in {@link Dropdown} stays trivial.
 */
export function nextEnabledIndex<T extends string>(options: DropdownOption<T>[], from: number, dir: 1 | -1): number {
  const n = options.length;
  if (n === 0) return -1;
  if (!options.some((o) => !o.disabled)) return -1;
  // Start the scan one step from `from`; when `from` is out of range (e.g. -1 for
  // "nothing active yet") begin at the first/last slot so opening lands on an edge.
  let i = from < 0 || from >= n ? (dir === 1 ? -1 : n) : from;
  for (let step = 0; step < n; step++) {
    i = (i + dir + n) % n;
    if (!options[i]?.disabled) return i;
  }
  return from >= 0 && from < n && !options[from]?.disabled ? from : -1;
}

/**
 * A styled single-select dropdown — a field-styled trigger plus a custom popover
 * list, so the open menu matches the app's look instead of the browser's native
 * (unstyleable) `<select>` list. Reach for it over {@link Select} when the open
 * options list needs to be styled / themed (the common case in dense editors);
 * keep `Select` for a plain native control. Fully keyboard-accessible
 * (Arrow/Home/End/Enter/Esc, ARIA listbox), auto-flips up near the viewport bottom,
 * and clamps its height to stay on-screen. Tailwind-first, overridable per slot.
 *
 *   <Dropdown
 *     aria-label="Wait kind"
 *     value={kind}
 *     onChange={setKind}
 *     options={[{ value: 'ms', label: 'for ms' }, { value: 'load', label: 'page load' }]}
 *   />
 */
export function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  align = 'left',
  direction = 'auto',
  disabled = false,
  id,
  className,
  style,
  classNames,
  styles,
  unstyled,
  ...aria
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  useEscapeKey(() => setOpen(false), open);

  // Measure the room around the trigger when the list opens so it flips up (or stays
  // down) and caps its height to never run off-screen; seed the keyboard highlight
  // on the selected row (or the first enabled one).
  useIsoLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const el = rootRef.current;
    if (el) {
      setPlacement(
        computePopoverPlacement({
          triggerRect: el.getBoundingClientRect(),
          viewportHeight: window.innerHeight,
          direction,
        }),
      );
    }
    setActive(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : nextEnabledIndex(options, -1, 1),
    );
  }, [open, direction]);

  const choose = (opt: DropdownOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => nextEnabledIndex(options, i, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => nextEnabledIndex(options, i, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(nextEnabledIndex(options, -1, 1));
        break;
      case 'End':
        e.preventDefault();
        setActive(nextEnabledIndex(options, options.length, -1));
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const opt = options[active];
        if (opt) choose(opt);
        break;
      }
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={resolveClass('relative inline-block', classNames?.root, unstyled)}
      style={resolveStyle({}, styles?.root, unstyled)}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria['aria-label']}
        className={resolveClass(TRIGGER_CLASS, classNames?.trigger ?? className, unstyled)}
        style={resolveStyle({}, styles?.trigger ?? style, unstyled)}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? undefined : 'text-gray-400 dark:text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <span
          aria-hidden
          className={resolveClass('shrink-0 text-gray-400 transition dark:text-gray-500', classNames?.caret, unstyled)}
        >
          ▾
        </span>
      </button>
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
            id={listId}
            role="listbox"
            aria-label={aria['aria-label']}
            className={resolveClass(
              `${POPOVER_CLASS} ${align === 'right' ? 'right-0' : 'left-0'} ${placement?.dir === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`,
              classNames?.popover,
              unstyled,
            )}
            style={resolveStyle(placement ? { maxHeight: placement.maxHeight } : {}, styles?.popover, unstyled)}
          >
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options</p>
            ) : (
              options.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === active;
                const state = opt.disabled
                  ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                  : isSelected
                    ? 'bg-accent/10 font-medium text-gray-900 dark:text-gray-100'
                    : isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    disabled={opt.disabled}
                    className={resolveClass(`${OPTION_BASE} ${state}`, classNames?.option, unstyled)}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => !opt.disabled && setActive(i)}
                  >
                    <span className="block">{opt.label}</span>
                    {opt.description != null && opt.description !== '' && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
