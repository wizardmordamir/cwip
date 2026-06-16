import type { CSSProperties, ReactNode } from 'react';
import { type ClassOverride, cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { ALERT_ASSERTIVE, ALERT_ICONS, ALERT_TONES, type AlertTone } from './alertTones';
import { DismissButton } from './DismissButton';

export type AlertSize = 'sm' | 'md';
export type AlertSlot = 'root' | 'icon' | 'body' | 'title' | 'content' | 'actions' | 'dismiss';

const SIZE: Record<AlertSize, { root: string; icon: string }> = {
  sm: { root: 'gap-2 rounded-lg px-3 py-2 text-xs', icon: 'text-sm' },
  md: { root: 'gap-2.5 rounded-lg px-4 py-3 text-sm', icon: 'text-base' },
};

export interface AlertProps extends StyleableProps<AlertSlot> {
  /** Semantic color + default live-region role. See {@link ALERT_TONES}. */
  tone?: AlertTone;
  /** Optional bold heading above the body. */
  title?: ReactNode;
  /** Leading icon: a node renders as-is; `true` uses the tone's default glyph
   *  ({@link ALERT_ICONS}); omitted/`false` shows none (faithful to plain banners). */
  icon?: ReactNode | boolean;
  /** Inline actions (buttons/links) pushed to the trailing edge of the row. */
  actions?: ReactNode;
  /** Show a "✕" close button; pair with {@link onDismiss}. */
  dismissible?: boolean;
  /** Called when the close button is clicked; presence implies `dismissible`. */
  onDismiss?: () => void;
  /** Accessible name for the close button (default "Dismiss"). */
  dismissLabel?: string;
  size?: AlertSize;
  /** Override the live-region role; defaults from the tone (error/warning →
   *  `alert`, else `status`). `'none'` omits the role entirely. */
  role?: 'alert' | 'status' | 'none';
  children?: ReactNode;
  /** Shortcut for `classNames.root`. */
  className?: string;
  /** Shortcut for `styles.root`. */
  style?: CSSProperties;
}

/**
 * A themeable inline status banner / callout — the one primitive for the
 * `rounded border bg-…-50 text-…` warning/error/success/info blocks both sibling
 * apps used to hand-roll. Picks a semantic `tone`, takes an optional `title`,
 * `icon`, trailing `actions`, and a dismiss button; sets the matching ARIA
 * live-region role automatically. Tailwind-first and overridable per slot
 * (`root`, `icon`, `body`, `title`, `content`, `actions`, `dismiss`) via the
 * styling system — see {@link StyleableProps}.
 */
export const Alert = ({
  tone = 'info',
  title,
  icon,
  actions,
  dismissible,
  onDismiss,
  dismissLabel = 'Dismiss',
  size = 'md',
  role,
  children,
  className,
  style,
  classNames,
  styles,
  unstyled,
}: AlertProps) => {
  const iconNode = icon === true ? ALERT_ICONS[tone] : icon === false ? null : icon;
  const showDismiss = dismissible || !!onDismiss;
  const resolvedRole = role ?? (ALERT_ASSERTIVE[tone] ? 'alert' : 'status');

  // Compose Alert's positioning onto the DismissButton's own default, then let the
  // app's `dismiss` slot override extend or replace the result.
  const dismissClass: ClassOverride = (buttonDefault) => {
    const withPosition = cx(buttonDefault, '-mr-1 shrink-0');
    const slot = classNames?.dismiss;
    return typeof slot === 'function' ? slot(withPosition) : cx(withPosition, slot);
  };

  return (
    <div
      role={resolvedRole === 'none' ? undefined : resolvedRole}
      className={resolveClass(
        cx('flex items-start border', SIZE[size].root, ALERT_TONES[tone]),
        classNames?.root ?? className,
        unstyled,
      )}
      style={resolveStyle({}, styles?.root ?? style, unstyled)}
    >
      {iconNode != null && iconNode !== '' && (
        <span
          aria-hidden
          className={resolveClass(cx('mt-px shrink-0 leading-none', SIZE[size].icon), classNames?.icon, unstyled)}
        >
          {iconNode}
        </span>
      )}
      <div className={resolveClass('min-w-0 flex-1', classNames?.body, unstyled)}>
        {title != null && title !== '' && (
          <div className={resolveClass('font-semibold', classNames?.title, unstyled)}>{title}</div>
        )}
        {children != null && children !== '' && (
          <div className={resolveClass(cx(!!title && 'mt-0.5', 'min-w-0'), classNames?.content, unstyled)}>
            {children}
          </div>
        )}
      </div>
      {actions != null && actions !== '' && (
        <div className={resolveClass('ml-auto flex shrink-0 items-center gap-2', classNames?.actions, unstyled)}>
          {actions}
        </div>
      )}
      {showDismiss && (
        <DismissButton
          label={dismissLabel}
          onClick={onDismiss}
          classNames={{ root: dismissClass }}
          unstyled={unstyled}
        />
      )}
    </div>
  );
};
