import { type ComponentPropsWithRef, useRef } from 'react';
import { useAutoSizeTextarea } from '../hooks';

export interface AutoGrowTextareaProps extends ComponentPropsWithRef<'textarea'> {
  /** Cap growth at this many px; past it the textarea scrolls internally. */
  maxHeight?: number;
}

/**
 * A textarea that grows with its content instead of scrolling internally, so it
 * never traps page scroll on mobile. Drop-in for a raw `<textarea>` — forwards all
 * props/refs. Callers keep their own `min-h-*` (a floor) and styling. For
 * fixed-pane editors (code/JSON) keep a raw textarea; this is for prose fields.
 *
 * Defaults to maxLength=10_000 — enough for messages/notes/comments. Override
 * explicitly for long-form editors (e.g. maxLength={200_000} for Markdown).
 */
export const AutoGrowTextarea = ({ maxHeight, ref, value, maxLength = 10_000, ...props }: AutoGrowTextareaProps) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useAutoSizeTextarea(innerRef, value, maxHeight);

  const setRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
  };

  return <textarea ref={setRef} value={value} maxLength={maxLength} {...props} />;
};
