import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Button, type ButtonProps } from './components/Button';
import { IconButton, type IconButtonProps } from './components/IconButton';

export interface ConfirmOptions {
  prompt: string;
  flavorText?: string;
  confirmText?: string;
  cancelText?: string;
}

export type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

/** Props the host app's dialog receives. Render any modal you like; call
 *  `onConfirm`/`onCancel` from its buttons (and on backdrop/Escape → `onCancel`). */
export interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Wrap an action so it only runs after the user confirms — the imperative
 *  counterpart to {@link ConfirmContext.ConfirmButton} for handlers that aren't a
 *  button (a `<select>` onChange, a drag end, a keyboard shortcut, …):
 *
 *    const confirm = useConfirm();
 *    onChange={guardWithConfirm(confirm, 'Switch and lose edits?', applyChange)}
 *
 *  The returned handler forwards its own args to `action`, so it drops straight
 *  into an existing event handler. A declined confirm is a no-op. */
export const guardWithConfirm =
  <Args extends unknown[]>(
    confirmFn: ConfirmFn,
    options: ConfirmOptions | string,
    action?: (...args: Args) => unknown,
  ) =>
  async (...args: Args): Promise<void> => {
    if (await confirmFn(options)) await action?.(...args);
  };

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The prompt shown before {@link ConfirmButtonProps.onConfirm} runs. A bare
   *  string is the prompt; pass {@link ConfirmOptions} to also set
   *  `confirmText`/`flavorText`/`cancelText`. */
  confirm: ConfirmOptions | string;
  /** Runs only after the user confirms (declining is a no-op). */
  onConfirm?: () => void | Promise<void>;
}

export interface ConfirmIconButtonProps extends Omit<IconButtonProps, 'onClick'> {
  /** The prompt shown before {@link ConfirmIconButtonProps.onConfirm} runs. */
  confirm: ConfirmOptions | string;
  /** Runs only after the user confirms (declining is a no-op). */
  onConfirm?: () => void | Promise<void>;
}

export interface ConfirmContext {
  ConfirmProvider: (props: { children: ReactNode }) => ReactNode;
  useConfirm: () => ConfirmFn;
  /** A {@link Button} that gates its action behind {@link ConfirmContext.useConfirm}
   *  — pass the `confirm` prompt + an `onConfirm` action instead of an `onClick`.
   *  Pre-bound to this context, so destructive actions need no `useConfirm`
   *  boilerplate. */
  ConfirmButton: (props: ConfirmButtonProps) => ReactNode;
  /** An {@link IconButton} ("✕"/trash affordance) gated behind the confirm flow —
   *  the standard confirm-before-delete icon button. */
  ConfirmIconButton: (props: ConfirmIconButtonProps) => ReactNode;
}

/**
 * Build a styled, app-native replacement for the browser's `confirm()`. You
 * supply the dialog component (so the look matches your app); cwip owns the
 * imperative promise plumbing. Mount `<ConfirmProvider>` once near the root;
 * `useConfirm()` returns `confirm(opts)` resolving true/false:
 *
 *   const { ConfirmProvider, useConfirm, ConfirmButton } = createConfirmContext(MyConfirmDialog);
 *   // …
 *   if (await confirm('Remove this?')) doIt();
 *   // …or, with zero boilerplate at the call site:
 *   <ConfirmButton variant="danger" confirm="Remove this?" onConfirm={doIt}>Remove</ConfirmButton>
 *
 * Backdrop / Escape / Cancel all resolve false. The returned `ConfirmButton` /
 * `ConfirmIconButton` are pre-bound to this context so destructive actions get a
 * consistent confirm flow without repeating the `useConfirm` + `await` dance.
 */
export const createConfirmContext = (Dialog: (props: ConfirmDialogProps) => ReactNode): ConfirmContext => {
  const Ctx = createContext<ConfirmFn>(async () => false);
  const useConfirm = (): ConfirmFn => useContext(Ctx);

  const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolverRef = useRef<((result: boolean) => void) | null>(null);

    const settle = useCallback((result: boolean) => {
      resolverRef.current?.(result);
      resolverRef.current = null;
      setOptions(null);
    }, []);

    const confirm = useCallback<ConfirmFn>((opts) => {
      // If a dialog is somehow already open, decline it before opening the new one.
      resolverRef.current?.(false);
      setOptions(typeof opts === 'string' ? { prompt: opts } : opts);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    }, []);

    return (
      <Ctx.Provider value={confirm}>
        {children}
        <Dialog
          open={options != null}
          options={options}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      </Ctx.Provider>
    );
  };

  const ConfirmButton = ({ confirm: options, onConfirm, ...rest }: ConfirmButtonProps): ReactNode => {
    const confirm = useConfirm();
    return <Button {...rest} onClick={guardWithConfirm(confirm, options, onConfirm)} />;
  };

  const ConfirmIconButton = ({ confirm: options, onConfirm, ...rest }: ConfirmIconButtonProps): ReactNode => {
    const confirm = useConfirm();
    return <IconButton {...rest} onClick={guardWithConfirm(confirm, options, onConfirm)} />;
  };

  return { ConfirmProvider, useConfirm, ConfirmButton, ConfirmIconButton };
};
