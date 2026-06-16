import type { ReactNode } from 'react';

/**
 * One sidebar row. The consuming app does its own eligibility filtering
 * (auth/role/enabled/…) and **resolves** `color`/`hidden`/`active` before passing
 * the entry, so the library stays agnostic to each app's prefs store and routing.
 * `id` is the stable key for ordering, drag, and React keys — use a unique route
 * path (an app whose route *titles* aren't unique must key by path here).
 */
export interface NavEntry {
  id: string;
  label: string;
  /** Link destination — passed to `linkComponent` as `to`, or `href` for `<a>`. */
  href: string;
  icon?: ReactNode;
  /** App-computed active state (exact match, "on a hub child", …). */
  active?: boolean;
  /** Resolved accent hex (the app looks it up from its own prefs keying). */
  color?: string;
  /** Resolved hidden flag (the app looks it up from its own prefs keying). */
  hidden?: boolean;
  /** Always-visible trailing node, e.g. an unread badge. */
  trailing?: ReactNode;
  /** Tooltip (when collapsed) + the key carrier some apps mutate prefs by
   *  (e.g. a route title, when color/hidden are stored by title not path). */
  title?: string;
}

/**
 * Discrete mutation callbacks. Each app wires these to its own store. They're kept
 * separate (not one `onChange(prefs)`) because an app may route `setHidden` to a
 * different store/thunk than `setOrder`/`setColor`; the mutated **entry** is passed
 * back so an app can key color/hidden by `entry.title` while ordering by `entry.id`.
 */
export interface NavPrefsActions {
  setOrder: (ids: string[]) => void;
  setHidden: (entry: NavEntry, hidden: boolean) => void;
  setColor: (entry: NavEntry, color: string | undefined) => void;
}

/** A searchable destination: a top-level nav item OR a page nested inside a hub. */
export interface NavSearchItem {
  id: string;
  label: string;
  href: string;
  /** Owning hub label — groups results and is also matched. Omit for top-level. */
  groupLabel?: string;
  icon?: ReactNode;
  /** Extra match terms (e.g. a description or synonyms). */
  keywords?: string[];
  /** Marks a destination currently hidden from the sidebar (shown dimmed). */
  hidden?: boolean;
}

/** One tile in a hub landing-page grid (HubTileGrid). */
export interface HubTile {
  /** Stable id for ordering/hiding/colors + React key (typically the route path). */
  id: string;
  /** Link destination (passed to `linkComponent` as `to`, or `href` for `<a>`). */
  href: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Optional status/extra node under the description. */
  badge?: ReactNode;
  /** Default accent hex, before a per-tile color override. */
  color?: string;
}
