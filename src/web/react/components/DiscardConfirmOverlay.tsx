import { Button } from './Button';

export interface DiscardConfirmOverlayProps {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** When provided, a third primary "Save changes" button is shown so the user can
   *  commit edits straight from the prompt. Omit it on forms with no single save
   *  action, or while invalid (so we never offer a save that no-ops). */
  onSave?: () => void;
  saveText?: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/**
 * The "Discard changes?" prompt shown on top of an editing modal when the user
 * tries to dismiss it with unsaved edits. Deliberately self-contained (it does NOT
 * use ModalShell) so it can layer above any modal — including ones built on
 * ModalShell — and to avoid a circular import. Sits at z-[80], above ModalShell's
 * highest (`top` = z-[70]) tier.
 */
export const DiscardConfirmOverlay = ({
  title = 'Discard changes?',
  message = 'You have unsaved changes. If you leave now, they’ll be lost.',
  confirmText = 'Discard',
  cancelText = 'Keep editing',
  onSave,
  saveText = 'Save changes',
  onKeepEditing,
  onDiscard,
}: DiscardConfirmOverlayProps) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <button type="button" aria-label={cancelText} className="absolute inset-0 bg-gray-900/50" onClick={onKeepEditing} />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="default" onClick={onKeepEditing}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          {confirmText}
        </Button>
        {onSave && (
          <Button variant="accent" onClick={onSave}>
            {saveText}
          </Button>
        )}
      </div>
    </div>
  </div>
);
