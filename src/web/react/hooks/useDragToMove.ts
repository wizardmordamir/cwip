import { useCallback, useRef, useState } from 'react';

/** Viewport-relative pixel position of a `position:fixed` element. */
export type DragPosition = { left: number; top: number };

interface DragState {
  startPx: number;
  startPy: number;
  startEl: number;
  startEt: number;
  elW: number;
  elH: number;
}

/**
 * Makes a `position:fixed` floating element draggable to any screen location.
 *
 * Attach `containerRef` to the outermost fixed container and `dragHandleProps`
 * to the element the user should grab. When `position` is null the container
 * keeps its CSS-class-based placement (whatever `bottom-*`/`right-*` defaults you
 * specify); once the user drags, `position` gives the persisted `{ left, top }`
 * that you should apply as an inline style override.
 *
 * Call `clearPosition()` to reset back to the CSS default (e.g. a "Reset position"
 * button in a settings menu).
 *
 * Position is persisted across page loads in `localStorage[storageKey]`.
 */
export function useDragToMove(storageKey: string): {
  position: DragPosition | null;
  clearPosition: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
  isDragging: boolean;
} {
  const [pos, setPos] = useState<DragPosition | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as DragPosition) : null;
    } catch {
      return null;
    }
  });

  const containerRef = useRef<HTMLElement | null>(null);
  const dragState = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragState.current = {
      startPx: e.clientX,
      startPy: e.clientY,
      startEl: rect.left,
      startEt: rect.top,
      elW: rect.width,
      elH: rect.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startPx;
    const dy = e.clientY - d.startPy;
    const left = Math.max(0, Math.min(d.startEl + dx, window.innerWidth - d.elW));
    const top = Math.max(0, Math.min(d.startEt + dy, window.innerHeight - d.elH));
    setPos({ left, top });
  }, []);

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLElement>) => {
      if (!dragState.current) return;
      dragState.current = null;
      setIsDragging(false);
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(p));
          } catch {}
        }
        return p;
      });
    },
    [storageKey],
  );

  const clearPosition = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setPos(null);
  }, [storageKey]);

  return {
    position: pos,
    clearPosition,
    containerRef,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      } as React.CSSProperties,
    },
    isDragging,
  };
}
