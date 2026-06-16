import type { ElementType } from 'react';
import { AddItemsMenu } from '../components/AddItemsMenu';
import { DismissButton } from '../components/DismissButton';
import { DragHandle } from '../components/DragHandle';
import { DropIndicator } from '../components/DropIndicator';
import { useDismissibleItems } from '../hooks/useDismissibleItems';
import { useDragReorder } from '../hooks/useDragReorder';
import { cx, resolveClass, type StyleableProps } from '../styling';
import { readableTextOn } from './colors';
import { NavColorPicker } from './NavColorPicker';
import { orderRank } from './partitionAndOrder';
import type { HubTile } from './types';

export type HubTileGridSlot =
  | 'root'
  | 'addBar'
  | 'grid'
  | 'tile'
  | 'link'
  | 'iconBox'
  | 'title'
  | 'description'
  | 'controls'
  | 'empty';

export interface HubTileGridProps extends StyleableProps<HubTileGridSlot> {
  tiles: HubTile[];
  /** Tile ids hidden in this hub. */
  hidden: string[];
  /** Tile ids in user order; anything missing keeps its natural spot. */
  order: string[];
  /** Tile id → accent hex (overrides each tile's default `color`). */
  colors?: Record<string, string>;
  onHiddenChange: (ids: string[]) => void;
  onOrderChange: (ids: string[]) => void;
  onColorChange: (id: string, color: string | undefined) => void;
  /** Element/component for tile links (default `<a>`; pass a router `Link`). */
  linkComponent?: ElementType;
  /** Grid flows left-to-right by default; matters for the drop-side calc. */
  axis?: 'x' | 'y';
  addLabel?: string;
  emptyLabel?: string;
  /** Accent for the drag drop-line (default emerald). */
  dropColor?: string;
}

const CARD =
  'group/tile block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700';
const ICON_BOX =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-700 dark:bg-gray-800 dark:text-gray-300';

/**
 * A hub landing-page tile grid: tiles reorder by dragging the grip, hide via the
 * "✕", restore from an "Add section" menu, and take a per-tile accent color.
 * Replaces the apps' hand-copied `HubGrid`; controlled (the app owns prefs) and
 * routing-agnostic via `linkComponent`. Built on the shared dismissible + drag +
 * color primitives.
 */
export const HubTileGrid = ({
  tiles,
  hidden,
  order,
  colors,
  onHiddenChange,
  onOrderChange,
  onColorChange,
  linkComponent: Link = 'a',
  axis = 'x',
  addLabel = 'Add section',
  emptyLabel = 'All sections hidden. Use “Add section” to bring one back.',
  dropColor,
  classNames,
  unstyled,
}: HubTileGridProps) => {
  const { visible: notHidden, hiddenItems } = useDismissibleItems<HubTile>({
    items: tiles,
    itemKey: (t) => t.id,
    hidden,
    onHiddenChange,
  });
  const visible = [...notHidden].sort((a, b) => orderRank(order, a.id) - orderRank(order, b.id));

  const { containerProps, getItemProps, getHandleProps } = useDragReorder({
    ids: visible.map((t) => t.id),
    onReorder: onOrderChange,
    axis,
  });

  const hide = (id: string) => onHiddenChange([...hidden.filter((x) => x !== id), id]);

  return (
    <div className={resolveClass('flex flex-col gap-3', classNames?.root, unstyled)}>
      {hiddenItems.length > 0 && (
        <div className={resolveClass('flex justify-end', classNames?.addBar, unstyled)}>
          <AddItemsMenu
            items={hiddenItems}
            onAdd={(t) => onHiddenChange(hidden.filter((x) => x !== t.id))}
            itemKey={(t) => t.id}
            itemLabel={(t) => t.title}
            itemDescription={(t) => t.description}
            label={addLabel}
            showCount
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p
          className={resolveClass(
            'rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400',
            classNames?.empty,
            unstyled,
          )}
        >
          {emptyLabel}
        </p>
      ) : (
        <div
          {...containerProps}
          className={resolveClass('grid grid-cols-1 gap-3 sm:grid-cols-2', classNames?.grid, unstyled)}
        >
          {visible.map((tile) => {
            const {
              isDragging,
              isOver: _isOver,
              insertBefore,
              insertAfter,
              style,
              onClickCapture,
              ...rest
            } = getItemProps(tile.id);
            const color = colors?.[tile.id] ?? tile.color;
            return (
              <div
                key={tile.id}
                {...rest}
                onClickCapture={onClickCapture}
                style={style}
                className={resolveClass(
                  cx('relative rounded-xl', isDragging && 'shadow-2xl'),
                  classNames?.tile,
                  unstyled,
                )}
              >
                {insertBefore && <DropIndicator orientation="vertical" side="start" color={dropColor} />}
                {insertAfter && <DropIndicator orientation="vertical" side="end" color={dropColor} />}
                {(() => {
                  const targetProps = Link === 'a' ? { href: tile.href } : { to: tile.href };
                  return (
                    <Link
                      {...targetProps}
                      className={resolveClass(CARD, classNames?.link, unstyled)}
                      style={color ? { boxShadow: `inset 3px 0 0 0 ${color}` } : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={resolveClass(ICON_BOX, classNames?.iconBox, unstyled)}
                          style={color ? { backgroundColor: color, color: readableTextOn(color) } : undefined}
                        >
                          {tile.icon}
                        </span>
                        {/* pr-12 leaves room for the controls in the top-right. */}
                        <div className="min-w-0 pr-12">
                          <p
                            className={resolveClass(
                              'font-semibold text-gray-900 dark:text-gray-100',
                              classNames?.title,
                              unstyled,
                            )}
                          >
                            {tile.title}
                          </p>
                          {tile.description && (
                            <p
                              className={resolveClass(
                                'text-sm text-gray-500 dark:text-gray-400',
                                classNames?.description,
                                unstyled,
                              )}
                            >
                              {tile.description}
                            </p>
                          )}
                          {tile.badge && <div className="mt-2">{tile.badge}</div>}
                        </div>
                      </div>
                    </Link>
                  );
                })()}
                {/* Controls are siblings of the link, so dragging/hiding never navigates. */}
                <div
                  className={resolveClass(
                    'absolute top-2 right-2 z-10 flex items-center gap-0.5',
                    classNames?.controls,
                    unstyled,
                  )}
                >
                  <NavColorPicker value={color} onChange={(next) => onColorChange(tile.id, next)} label={tile.title} />
                  {/* alwaysVisible: the controls sit in a non-`group` corner cluster
                      (siblings of the link), so a hover-reveal grip would be invisible
                      on desktop — keep it shown, matching a tile's persistent grip. */}
                  <DragHandle handleProps={getHandleProps(tile.id)} alwaysVisible />
                  <DismissButton label={`Hide ${tile.title}`} title="Hide section" onClick={() => hide(tile.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
