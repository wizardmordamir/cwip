import { useCallback, useState } from 'react';
import { useEscapeKey } from './useEscapeKey';

export interface UseDiscardGuardOptions {
  /** Whether the guard is active at all. When false this degrades to a plain close. */
  enabled: boolean;
  /** Whether the form has unsaved edits worth confirming about. */
  dirty: boolean;
  onClose: () => void;
  /** Whether to listen for Escape (default true). A panel that keeps this hook
   *  mounted while hidden should pass its open state so a stray Escape doesn't
   *  fire while closed. */
  active?: boolean;
}

/**
 * Centralizes the "warn before discarding unsaved edits" flow editing modals
 * share. `requestClose` is what every *soft* dismiss (backdrop click, Escape,
 * the header close button) should call instead of `onClose`: it pops a
 * confirmation when the form is dirty, otherwise closes immediately. An explicit
 * Save/Cancel button is an intentional choice and should still call the real
 * `onClose`.
 *
 * Escape is handled here so the prompt itself is dismissible: while the confirm
 * is showing, Escape keeps editing; otherwise it behaves like any other dismiss.
 */
export const useDiscardGuard = ({ enabled, dirty, onClose, active = true }: UseDiscardGuardOptions) => {
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (enabled && dirty) setConfirming(true);
    else onClose();
  }, [enabled, dirty, onClose]);

  const keepEditing = useCallback(() => setConfirming(false), []);
  const discard = useCallback(() => {
    setConfirming(false);
    onClose();
  }, [onClose]);

  useEscapeKey(confirming ? keepEditing : requestClose, active);

  return { confirming, requestClose, keepEditing, discard };
};
