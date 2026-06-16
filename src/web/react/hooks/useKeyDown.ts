import { useEffect, useRef } from 'react';

// Friendly aliases → the `KeyboardEvent.key` value they map to. Anything not
// listed is treated as a raw `event.key` (so `useKeyDown('a', …)` works too).
const KEY_ALIASES: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  space: ' ',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
};

export interface UseKeyDownOptions {
  /** Listen only while active (default true). */
  active?: boolean;
  /** Call `event.preventDefault()` on match (default true). */
  preventDefault?: boolean;
  /** Target to listen on (default `document`). */
  target?: Pick<Document | HTMLElement, 'addEventListener' | 'removeEventListener'>;
}

/**
 * Run `handler` whenever `key` is pressed. `key` is a friendly alias
 * (`'enter'`, `'escape'`, `'space'`, the arrows…) or a raw `KeyboardEvent.key`.
 * The handler is always the latest one (held in a ref), so a closure reading
 * state never goes stale even though the listener is registered once.
 */
export const useKeyDown = (
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: UseKeyDownOptions = {},
): void => {
  const { active = true, preventDefault = true, target } = options;
  const targetKey = KEY_ALIASES[key] ?? key;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const el = target ?? document;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        if (preventDefault) event.preventDefault();
        handlerRef.current(event);
      }
    };
    el.addEventListener('keydown', onKeyDown as EventListener);
    return () => el.removeEventListener('keydown', onKeyDown as EventListener);
  }, [targetKey, active, preventDefault, target]);
};
