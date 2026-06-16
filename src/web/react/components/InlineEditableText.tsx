import { useState } from 'react';
import { cx } from '../styling';

export interface InlineEditableTextProps {
  value: string;
  /** Called with the trimmed next value only when it actually changed. */
  onSave: (next: string) => void;
  /** When false, the text is plain (no click-to-edit, no affordance). */
  canEdit?: boolean;
  /** Render a textarea (Cmd/Ctrl+Enter or blur saves; Enter inserts a newline)
   *  instead of a single-line input (Enter or blur saves). */
  multiline?: boolean;
  /** Shown muted when the value is empty and the user can edit. */
  placeholder?: string;
  /** Applied to BOTH the display element and the editor so editing looks like the
   *  text it replaces (e.g. an h1's `text-2xl font-bold`). */
  className?: string;
  ariaLabel?: string;
}

/**
 * Click-to-edit text: shows the value, and (when editable) turns into an input /
 * textarea on click. Enter/blur commit, Escape cancels. The single inline-edit
 * primitive — use it anywhere a title/description should be edited in place rather
 * than from a separate modal.
 */
export const InlineEditableText = ({
  value,
  onSave,
  canEdit = true,
  multiline = false,
  placeholder = 'Add text…',
  className = '',
  ariaLabel,
}: InlineEditableTextProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const begin = () => {
    if (!canEdit) return;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value.trim()) onSave(next);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  // Focus + select as soon as the editor mounts (it only renders while editing).
  const focusOnMount = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!el) return;
    el.focus();
    el.select();
  };

  if (editing) {
    const editorClass = cx('w-full rounded-md bg-transparent px-1 outline-none ring-2 ring-sky-500/60', className);
    if (multiline) {
      return (
        <textarea
          ref={focusOnMount}
          aria-label={ariaLabel}
          className={cx(editorClass, 'resize-none')}
          rows={Math.max(2, draft.split('\n').length)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
            else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
          }}
        />
      );
    }
    return (
      <input
        ref={focusOnMount}
        aria-label={ariaLabel}
        className={editorClass}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  // Non-editors with no value get nothing to render.
  if (!canEdit && !value) return null;

  const emptyClass = value ? '' : 'italic text-gray-400 dark:text-gray-500';

  // Read-only: plain text.
  if (!canEdit) return <span className={className}>{value}</span>;

  // Editable display: a real <button> so Enter/Space activation and focus come for
  // free, styled to read as inline text.
  return (
    <button
      type="button"
      title="Click to edit"
      onClick={begin}
      className={cx(
        className,
        emptyClass,
        'cursor-text whitespace-pre-wrap break-words rounded-md -mx-1 px-1 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800',
      )}
    >
      {value || placeholder}
    </button>
  );
};
