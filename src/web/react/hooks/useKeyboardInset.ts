import { useEffect } from 'react';

/**
 * Publish the on-screen keyboard's height as a CSS variable `--keyboard-inset`
 * on `<html>` (px). Install once near the app root.
 *
 * On mobile the software keyboard overlays the layout viewport, which stays its
 * full `dvh` height — so content near the bottom hides behind the keyboard and
 * can't be scrolled into view. Layout can't see the keyboard, but the
 * VisualViewport API can: the gap between the layout viewport
 * (`window.innerHeight`) and the visible viewport is the keyboard. Exposing it
 * as a variable lets bottom spacers reserve room to scroll the last line clear
 * of the keyboard while typing.
 *
 * No-ops where VisualViewport is unavailable (older browsers / desktop); set a
 * `--keyboard-inset: 0px` default in your CSS so consumers always have a value.
 */
export const useKeyboardInset = (): void => {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    const update = () => {
      // Layout viewport minus the visible viewport (and any visual scroll
      // offset) is what the keyboard covers. Clamp negatives (e.g. while zooming).
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.setProperty('--keyboard-inset', '0px');
    };
  }, []);
};
