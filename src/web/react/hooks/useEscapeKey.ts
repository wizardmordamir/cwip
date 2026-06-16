import { useEffect } from 'react';

/**
 * Call `handler` when Escape is pressed, while `active` (e.g. a modal is open).
 * Centralizes the Escape-to-close behavior every dialog needs.
 */
export const useEscapeKey = (handler: () => void, active = true): void => {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, handler]);
};
