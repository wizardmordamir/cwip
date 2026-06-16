import { type CSSProperties, type ElementType, type ReactNode, useState } from 'react';
import { REVEAL_ON_HOVER } from '../components/revealOnHover';
import { cx, resolveClass, resolveStyle, type StyleableProps } from '../styling';
import { NavItemMenu } from './NavItemMenu';
import type { NavEntry } from './types';

export type SideNavItemSlot =
  | 'root' // the relative wrapper (carries `group` for the hover-revealed kebab)
  | 'link'
  | 'active' // active-state classes (the emerald-vs-accent divergence)
  | 'inactive'
  | 'menuActive' // ring on the row while ITS kebab menu is open (the owning-row cue)
  | 'icon'
  | 'label'
  | 'trailing'
  | 'menu';

export interface SideNavItemProps extends StyleableProps<SideNavItemSlot> {
  entry: NavEntry;
  collapsed?: boolean;
  /** Element/component for the link (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  /** Fired on activation (e.g. close the mobile drawer). */
  onNavigate?: () => void;
  /** Recolor/hide callbacks — omit both to render the row without a kebab menu. */
  onColor?: (entry: NavEntry, color: string | undefined) => void;
  onHide?: (entry: NavEntry, hidden: boolean) => void;
  /** App-specific actions appended inside the kebab menu. */
  menuExtras?: (entry: NavEntry) => ReactNode;
}

const LINK_BASE = 'flex h-10 items-center gap-3 rounded-lg pl-3 pr-2 text-sm font-medium transition';
const ACTIVE_DEFAULT = 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100';
const INACTIVE_DEFAULT = 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';
// While this row's kebab menu is open, ring the row so it's unmistakable which item
// the (portal-rendered, detached) popover belongs to.
const MENU_ACTIVE_DEFAULT = 'ring-2 ring-inset ring-gray-300 dark:ring-gray-600';

/**
 * One side-nav row: a link (`icon + label`) with an active highlight and an
 * optional accent (a left inset bar + icon tint from `entry.color`). Collapses to
 * an icon rail on desktop. A hover-revealed kebab (sibling of the link, so it
 * never navigates) recolors/hides the row + hosts `menuExtras`. The active-state
 * look is its own slot so each app themes it (emerald, accent, …). While that kebab
 * menu is open the row rings itself and pins the kebab visible, and the popover
 * names the row — so the detached popover is never mistaken for another item's.
 */
export const SideNavItem = ({
  entry,
  collapsed,
  linkComponent: Link = 'a',
  onNavigate,
  onColor,
  onHide,
  menuExtras,
  classNames,
  styles,
  unstyled,
}: SideNavItemProps) => {
  const { href, label, icon, active, color, trailing, title } = entry;
  const hasMenu = Boolean(onColor && onHide) && !collapsed;
  const [menuOpen, setMenuOpen] = useState(false);

  const activeClass = resolveClass(ACTIVE_DEFAULT, classNames?.active, unstyled);
  const inactiveClass = resolveClass(INACTIVE_DEFAULT, classNames?.inactive, unstyled);
  const menuActiveClass = resolveClass(MENU_ACTIVE_DEFAULT, classNames?.menuActive, unstyled);
  const linkClass = resolveClass(
    cx(
      LINK_BASE,
      collapsed && 'md:justify-center',
      hasMenu && 'pr-9',
      active ? activeClass : inactiveClass,
      menuOpen && menuActiveClass,
    ),
    classNames?.link,
    unstyled,
  );
  // Accent bar is structural (inline box-shadow) so it doesn't shift the row.
  const linkStyle = resolveStyle(
    color && !active ? { boxShadow: `inset 3px 0 0 0 ${color}` } : {},
    styles?.link,
    unstyled,
  );
  const targetProps = Link === 'a' ? { href } : { to: href };
  const iconStyle: CSSProperties | undefined = color && !active ? { color } : undefined;

  return (
    <div className={resolveClass('group relative', classNames?.root, unstyled)}>
      <Link
        {...targetProps}
        onClick={onNavigate}
        title={collapsed ? (title ?? label) : undefined}
        className={linkClass}
        style={linkStyle}
      >
        <span className={resolveClass('shrink-0 text-lg', classNames?.icon, unstyled)} style={iconStyle}>
          {icon}
        </span>
        <span className={resolveClass(cx('grow truncate', collapsed && 'md:hidden'), classNames?.label, unstyled)}>
          {label}
        </span>
        {trailing && (
          <span className={resolveClass(cx('shrink-0', collapsed && 'md:hidden'), classNames?.trailing, unstyled)}>
            {trailing}
          </span>
        )}
      </Link>
      {hasMenu && (
        <span
          className={resolveClass(
            cx(
              'absolute right-1 top-1/2 -translate-y-1/2',
              REVEAL_ON_HOVER,
              'focus-within:opacity-100',
              // Keep the kebab on-screen while its menu is open (else the hover-reveal
              // fades the very button the popover points back to).
              menuOpen && 'opacity-100',
            ),
            classNames?.menu,
            unstyled,
          )}
        >
          <NavItemMenu
            label={label}
            headerIcon={icon}
            color={color}
            onColor={(c) => onColor?.(entry, c)}
            onHide={() => onHide?.(entry, true)}
            onOpenChange={setMenuOpen}
          >
            {menuExtras?.(entry)}
          </NavItemMenu>
        </span>
      )}
    </div>
  );
};
