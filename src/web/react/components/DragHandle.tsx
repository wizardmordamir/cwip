import { cx, resolveClass, type StyleableProps } from '../styling';
import { REVEAL_ON_HOVER } from './revealOnHover';

export type DragHandleSlot = 'root';

export interface DragHandleProps extends StyleableProps<DragHandleSlot> {
  /** Spread from `useDragReorder`'s `getHandleProps(id)` — the pointer-down
   *  listener plus grab cursor / touch-action styles. */
  handleProps: Record<string, unknown>;
  label?: string;
  /** Always show the grip (don't hover-reveal). Defaults to revealing on hover on
   *  fine pointers while staying visible on touch. */
  alwaysVisible?: boolean;
  className?: string;
}

// The 6-dot grip glyph shared by every drag handle.
const Grip = () => (
  <span aria-hidden className="grid grid-cols-2 gap-0.5">
    {Array.from({ length: 6 }, (_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6-dot glyph
      <span key={i} className="h-1 w-1 rounded-full bg-current" />
    ))}
  </span>
);

/**
 * A dedicated, always-touch-tappable drag-to-reorder marker. On touch it's visible
 * and ≥44px tall so it can be grabbed; on a mouse it hover-reveals unless
 * `alwaysVisible`. Use as the grab affordance instead of making a whole row
 * draggable, so taps/clicks on the row still work. Its container needs `group`.
 */
export const DragHandle = ({
  handleProps,
  label = 'Drag to reorder',
  alwaysVisible = false,
  className,
  classNames,
  unstyled,
}: DragHandleProps) => (
  <button
    type="button"
    {...handleProps}
    aria-label={label}
    title={label}
    className={resolveClass(
      cx(
        'flex w-6 shrink-0 items-center justify-center self-stretch text-gray-300 dark:text-gray-600 pointer-coarse:min-h-[44px] pointer-coarse:w-8',
        alwaysVisible ? 'transition' : REVEAL_ON_HOVER,
      ),
      classNames?.root ?? className,
      unstyled,
    )}
  >
    <Grip />
  </button>
);
