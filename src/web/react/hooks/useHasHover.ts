import { useEffect, useState } from 'react';

// A device "has hover" when it exposes a fine pointer that can hover (a mouse or
// trackpad) — i.e. NOT a touch screen. We test both axes so a hybrid laptop with
// a touchscreen AND a trackpad still counts as hover-capable.
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

const detectHasHover = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(HOVER_QUERY).matches;
};

/**
 * Whether the device has a hover-capable pointer (mouse/trackpad) rather than a
 * touch screen, via the `(hover: hover) and (pointer: fine)` media query. Returns
 * `true` on the server / where `matchMedia` is unavailable, so hover-only UI
 * degrades to its desktop default instead of flashing a touch fallback.
 *
 * Reactive: a hybrid device that gains/loses a pointer (plug in a mouse, detach a
 * keyboard cover) updates live. Pair with components that need to swap a
 * hover-only affordance for a tap-friendly one — see {@link Tooltip}.
 */
export const useHasHover = (): boolean => {
  const [hasHover, setHasHover] = useState(detectHasHover);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(HOVER_QUERY);
    const onChange = () => setHasHover(mql.matches);
    // Sync once in case the media state changed between the render-time initializer
    // and this effect running.
    onChange();
    // `addEventListener('change')` is the modern API; older Safari only has the
    // deprecated `addListener`.
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return hasHover;
};
