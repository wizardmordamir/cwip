import { type RefObject, useLayoutEffect } from 'react';

/**
 * Grow a textarea to fit its content so it never shows an internal scrollbar.
 *
 * A fixed-height textarea scrolls its own content, which on mobile traps the
 * page (dragging over the textarea scrolls it instead of the page). Letting it
 * grow means the whole page scrolls naturally.
 *
 * To cap growth (e.g. a chat composer), give the element a CSS `max-height`
 * (a `max-h-*` class) or pass `maxHeight` (px); past the cap it scrolls
 * internally. The prop wins if both are set.
 *
 * Keyed on `value` so it re-measures on every change, including programmatic
 * ones. Also listens to the element's own `input` event so uncontrolled
 * textareas grow while typing, and re-measures on window resize (vw widths
 * re-wrap on rotate).
 */
export const useAutoSizeTextarea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: unknown,
  maxHeight?: number,
): void => {
  // `value` is not read in the effect — it's an intentional re-measure trigger so
  // a programmatic value change (loading a different note) re-fits the textarea.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when value changes
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resize = () => {
      // Collapse first so scrollHeight reflects content, not the current height.
      el.style.height = 'auto';
      // Honor an explicit prop, else the element's CSS max-height (max-h-*);
      // getComputedStyle resolves vh/rem to px. 'none' → NaN → no cap.
      const cssMax = Number.parseFloat(getComputedStyle(el).maxHeight);
      const cap = maxHeight ?? (Number.isFinite(cssMax) ? cssMax : Number.POSITIVE_INFINITY);
      el.style.height = `${Math.min(el.scrollHeight, cap)}px`;
      el.style.overflowY = el.scrollHeight > cap ? 'auto' : 'hidden';
    };

    resize();
    el.addEventListener('input', resize);
    window.addEventListener('resize', resize);
    return () => {
      el.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
    };
  }, [ref, value, maxHeight]);
};
