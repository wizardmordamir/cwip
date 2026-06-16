import { type ReactNode, useEffect, useState } from 'react';
import { useDiscardGuard } from '../hooks';
import { cx, resolveClass, type StyleableProps } from '../styling';
import { DiscardConfirmOverlay } from './DiscardConfirmOverlay';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
// Stacking level: a confirm dialog opened on top of another modal needs to sit
// above it, hence the raised/top tiers.
export type ModalLevel = 'base' | 'raised' | 'top';

export type ModalShellSlot = 'overlay' | 'backdrop' | 'panel' | 'header' | 'body' | 'footer';

// Desktop max-width. On mobile, full-screen modals ignore this; compact (sm)
// modals keep it at every breakpoint.
const SIZE_CLASS: Record<ModalSize, string> = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
// Same widths but only from the `sm` breakpoint up — used by full-screen modals so
// they stay edge-to-edge on phones. Written out so Tailwind's scanner emits them.
const SIZE_CLASS_DESKTOP: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
};
const LEVEL_CLASS: Record<ModalLevel, string> = { base: 'z-50', raised: 'z-[60]', top: 'z-[70]' };

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" role="img">
    <title>Close</title>
    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export interface ModalShellProps extends StyleableProps<ModalShellSlot> {
  onClose: () => void;
  /** Header is rendered only when a title is given. Omit for bare/compact dialogs. */
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: ModalSize;
  level?: ModalLevel;
  /** Optional sticky footer bar (e.g. Cancel / Save buttons). */
  footer?: ReactNode;
  children: ReactNode;
  /** Override the body content wrapper (padding/gap/layout). The scroll region
   *  around it is structural and always applied. */
  bodyClassName?: string;
  /** Extra classes for the panel itself (shortcut for `classNames.panel`). */
  className?: string;
  /** Fill the screen on mobile (no margins/rounding). Defaults on for md/lg/xl;
   *  sm stays a compact centered card. */
  mobileFullScreen?: boolean;
  /** Guard against losing work: a *soft* dismiss (backdrop/Escape/close button)
   *  only closes if clean — otherwise it shows a "Discard changes?" confirmation
   *  first. Footer Save/Cancel buttons bypass the guard (call `onClose` directly).
   *  Dirtiness is auto-detected from the first input/change inside the modal unless
   *  you pass `dirty` explicitly. */
  confirmOnClose?: boolean;
  /** Explicit unsaved-edits flag; overrides auto-detection. Only meaningful with
   *  `confirmOnClose`. */
  dirty?: boolean;
  discardTitle?: string;
  discardMessage?: string;
  /** When given, the discard prompt also offers a "Save changes" button running
   *  this. Pass it only when the form is currently saveable. */
  onSave?: () => void | Promise<void>;
  saveText?: string;
}

/**
 * The canonical modal shell: backdrop (click-to-close) + Escape-to-close + a
 * surface panel with an optional header (title/subtitle/close) and footer bar. On
 * mobile, larger modals fill the screen (header/footer pinned, body scrolls); on
 * desktop they're centered rounded cards. Render it conditionally from the parent
 * (each open remounts with fresh state); it has no `isOpen` prop. Overridable per
 * slot (`overlay`/`backdrop`/`panel`/`header`/`body`/`footer`).
 */
export const ModalShell = ({
  onClose,
  title,
  subtitle,
  size = 'md',
  level = 'base',
  footer,
  children,
  bodyClassName = 'flex flex-col gap-4 px-5 py-4',
  className,
  mobileFullScreen,
  confirmOnClose = false,
  dirty,
  discardTitle,
  discardMessage,
  onSave,
  saveText,
  classNames,
  unstyled,
}: ModalShellProps) => {
  // When the guard is on and the parent didn't pass an explicit `dirty`, treat the
  // first input/change anywhere inside the panel as "the user started editing".
  const [autoDirty, setAutoDirty] = useState(false);
  const autoTrack = confirmOnClose && dirty === undefined;
  const isDirty = dirty ?? autoDirty;

  const { confirming, requestClose, keepEditing, discard } = useDiscardGuard({
    enabled: confirmOnClose,
    dirty: isDirty,
    onClose,
  });

  // Lock background scroll while open; pad for the now-missing scrollbar to avoid a
  // desktop content shift. Stacked modals nest safely (each restores what it captured).
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  const fillMobile = mobileFullScreen ?? size !== 'sm';

  const overlayClass = cx(
    'fixed inset-0 flex justify-center',
    LEVEL_CLASS[level],
    fillMobile ? 'items-stretch p-0 sm:items-center sm:p-4' : 'items-center p-4',
  );

  const panelClass = cx(
    'relative z-10 flex w-full flex-col overflow-hidden bg-white text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100',
    fillMobile
      ? `h-full border-gray-200 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border ${SIZE_CLASS_DESKTOP[size]} dark:border-gray-800`
      : `max-h-[90vh] rounded-2xl border border-gray-200 ${SIZE_CLASS[size]} dark:border-gray-800`,
  );

  const markDirty = autoTrack ? () => setAutoDirty(true) : undefined;

  return (
    <div className={resolveClass(overlayClass, classNames?.overlay, unstyled)}>
      <button
        type="button"
        aria-label="Close"
        className={resolveClass('absolute inset-0 bg-gray-900/60 backdrop-blur-sm', classNames?.backdrop, unstyled)}
        onClick={requestClose}
      />
      {/* onChange/onInput bubble up from any field inside, so one handler notices editing. */}
      <div
        className={resolveClass(panelClass, classNames?.panel ?? className, unstyled)}
        onChange={markDirty}
        onInput={markDirty}
      >
        {title !== undefined && (
          <div
            className={resolveClass(
              'flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800',
              classNames?.header,
              unstyled,
            )}
          >
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{title}</h2>
              {subtitle && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            <button
              type="button"
              aria-label="Close"
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={requestClose}
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Structural scroll region: header/footer stay pinned, this grows and scrolls. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className={resolveClass(bodyClassName, classNames?.body, unstyled)}>{children}</div>
        </div>

        {footer && (
          <div
            className={resolveClass(
              'flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800',
              classNames?.footer,
              unstyled,
            )}
          >
            {footer}
          </div>
        )}
      </div>

      {confirming && (
        <DiscardConfirmOverlay
          title={discardTitle}
          message={discardMessage}
          onKeepEditing={keepEditing}
          onDiscard={discard}
          saveText={saveText}
          onSave={
            onSave
              ? () => {
                  keepEditing();
                  void onSave();
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
