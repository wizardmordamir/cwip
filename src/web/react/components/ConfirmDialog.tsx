import type { ReactNode } from 'react';
import type { ConfirmDialogProps } from '../confirm';
import { Button } from './Button';
import { ModalShell } from './ModalShell';

/**
 * The shared confirmation dialog — a compact centered modal (ModalShell `sm` size,
 * `top` level so it stacks above any modal that opened it) with a prompt, optional
 * flavor text, and Cancel / Confirm buttons. Confirm is a `danger` action (the
 * common destructive case); backdrop / Escape / Cancel all decline.
 *
 * It implements cwip's {@link ConfirmDialogProps}, so it pairs directly with the
 * imperative confirm plumbing — no app-specific dialog needed:
 *
 *   const { ConfirmProvider, useConfirm } = createConfirmContext(ConfirmDialog);
 *
 * Tailwind-first (gray/red scale + `dark:`), so it adopts the host app's theme.
 * Renders nothing when closed.
 */
export const ConfirmDialog = ({ open, options, onConfirm, onCancel }: ConfirmDialogProps): ReactNode => {
  if (!open || !options) return null;
  const { prompt, flavorText, confirmText = 'Confirm', cancelText = 'Cancel' } = options;
  return (
    <ModalShell size="sm" level="top" onClose={onCancel} bodyClassName="p-6">
      <h2 className="text-center text-lg font-semibold">{prompt}</h2>
      {flavorText && <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">{flavorText}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="default" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </ModalShell>
  );
};
