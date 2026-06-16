import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { resolveClass, resolveStyle, type StyleableProps } from './styling';

/** The styleable slots: wrapper, the icon button, the popover panel, its heading. */
export type InfoHintSlot = 'root' | 'icon' | 'panel' | 'title';

export interface InfoHintProps extends StyleableProps<InfoHintSlot> {
  /** Bold heading shown at the top of the panel (optional). */
  title?: ReactNode;
  /** The explanation body — any node, so use <code>, lists, multiple <p>s. */
  children: ReactNode;
  /**
   * Which edge of the icon the panel hangs from. Use `'right'` for fields near
   * the right of a layout so the panel doesn't overflow. Default `'left'`.
   */
  align?: 'left' | 'right';
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

// Tailwind-first defaults. They lean on semantic tokens an app supplies via its
// own theme — `accent` (the icon's hover colour) and the default gray scale plus
// the `dark:` variant — so the hint adopts whatever brand the host app defines.
// Override or replace any slot via classNames/styles/unstyled (see StyleableProps).
// NOTE: a Tailwind v4 app must register cwip's dist as a source so these utility
// classes get generated (v4 skips node_modules by default) — `@import
// "cwip/styles.css";`, or `@source` the whole `cwip/dist`.
const ICON_CLASS =
  'inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-current text-gray-400 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none';

// Visual (look) defaults live in classes; positioning is the structural inline
// layer (kept by `unstyled`, dropped only by `unstyled: 'all'`).
const ROOT_STYLE: CSSProperties = { position: 'relative', display: 'inline-flex' };

const PANEL_CLASS =
  'block w-64 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300';

const panelStyle = (align: 'left' | 'right'): CSSProperties => ({
  position: 'absolute',
  top: '100%',
  marginTop: 6,
  zIndex: 20,
  ...(align === 'right' ? { right: 0 } : { left: 0 }),
});

const TITLE_CLASS = 'mb-1 block font-semibold text-gray-900 dark:text-gray-100';

/**
 * A small "ⓘ" help affordance for a form field (or anything): an info icon that
 * reveals a richer explanation on **hover/focus** and **pins open on click**, so
 * the text can be read or selected without keeping the pointer over it. Closes on
 * pointer-leave (when unpinned), blur, Escape, or an outside click.
 *
 * Unlike a native `title=` tooltip the body is a `ReactNode`, so a field can
 * document itself with real formatting. Tailwind-first, overridable per slot
 * (`root`, `icon`, `panel`, `title`) via `classNames`/`styles`/`unstyled`.
 *
 *   <label>
 *     Env key <InfoHint title="Env key">Maps to the server <code>QB_&lt;KEY&gt;_PASSWORD</code> var.</InfoHint>
 *     <input … />
 *   </label>
 */
export const InfoHint = ({
  title,
  children,
  align = 'left',
  className,
  style,
  classNames,
  styles,
  unstyled,
}: InfoHintProps) => {
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const open = hovering || pinned;

  // While pinned, an outside click or Escape closes it. (Hover/focus open and
  // close on their own and need no global listeners.)
  useEffect(() => {
    if (!pinned) return;
    const close = () => setPinned(false);
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only convenience around the real control (the button below); keyboard users get the same panel via the button's focus/blur handlers.
    <span
      ref={wrapRef}
      className={resolveClass('', classNames?.root ?? className, unstyled)}
      style={resolveStyle(ROOT_STYLE, styles?.root ?? style, unstyled)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        aria-label={typeof title === 'string' ? `Help: ${title}` : 'More info'}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        onClick={(e) => {
          // Inside a <label>, swallow the click so it doesn't also focus the field.
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
        }}
        className={resolveClass(ICON_CLASS, classNames?.icon, unstyled)}
        style={resolveStyle({}, styles?.icon, unstyled)}
      >
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 11v5" />
          <path d="M12 7.5h.01" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={resolveClass(PANEL_CLASS, classNames?.panel, unstyled)}
          style={resolveStyle(panelStyle(align), styles?.panel, unstyled)}
        >
          {title && (
            <span
              className={resolveClass(TITLE_CLASS, classNames?.title, unstyled)}
              style={resolveStyle({}, styles?.title, unstyled)}
            >
              {title}
            </span>
          )}
          {children}
        </span>
      )}
    </span>
  );
};
