import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ConfirmDialogProps, createConfirmContext } from './confirm';

// A minimal host dialog: renders the prompt + Confirm/Cancel buttons while open,
// wired to the context's resolve/reject callbacks. The SSR specs (confirm.spec.tsx)
// cover the pure promise plumbing; these drive the full click→open→settle flow in a
// live DOM.
const TestDialog = ({ open, options, onConfirm, onCancel }: ConfirmDialogProps) =>
  open ? (
    <div role="dialog" aria-label="confirm">
      <p>{options?.prompt}</p>
      <button type="button" onClick={onConfirm}>
        {options?.confirmText ?? 'Confirm'}
      </button>
      <button type="button" onClick={onCancel}>
        {options?.cancelText ?? 'Cancel'}
      </button>
    </div>
  ) : null;

describe('createConfirmContext — ConfirmButton flow', () => {
  it('opens the dialog on click and runs onConfirm only after confirming', async () => {
    const { ConfirmProvider, ConfirmButton } = createConfirmContext(TestDialog);
    let confirmed = false;
    render(
      <ConfirmProvider>
        <ConfirmButton
          variant="danger"
          confirm="Delete this game?"
          onConfirm={() => {
            confirmed = true;
          }}
        >
          Remove
        </ConfirmButton>
      </ConfirmProvider>,
    );

    // No dialog until the trigger is clicked.
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    // Dialog opens with the prompt; the action hasn't run yet.
    expect(screen.getByText('Delete this game?')).not.toBeNull();
    expect(confirmed).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(confirmed).toBe(true));
    // Settling closes the dialog.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does NOT run onConfirm when the user cancels, and closes the dialog', async () => {
    const { ConfirmProvider, ConfirmButton } = createConfirmContext(TestDialog);
    let confirmed = false;
    render(
      <ConfirmProvider>
        <ConfirmButton
          confirm="Discard?"
          onConfirm={() => {
            confirmed = true;
          }}
        >
          Discard
        </ConfirmButton>
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('dialog')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Give any (incorrect) deferred action a chance to run, then assert it didn't.
    await Promise.resolve();
    expect(confirmed).toBe(false);
  });

  it('honors confirmText/cancelText from a ConfirmOptions object', () => {
    const { ConfirmProvider, ConfirmButton } = createConfirmContext(TestDialog);
    render(
      <ConfirmProvider>
        <ConfirmButton confirm={{ prompt: 'Remove user?', confirmText: 'Remove', cancelText: 'Keep' }}>
          Open
        </ConfirmButton>
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Remove' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Keep' })).not.toBeNull();
  });
});

describe('createConfirmContext — ConfirmIconButton flow', () => {
  it('renders a labeled icon button that gates its action behind confirm', async () => {
    const { ConfirmProvider, ConfirmIconButton } = createConfirmContext(TestDialog);
    let confirmed = false;
    render(
      <ConfirmProvider>
        <ConfirmIconButton
          label="Delete game"
          confirm="Delete this game?"
          onConfirm={() => {
            confirmed = true;
          }}
        >
          ✕
        </ConfirmIconButton>
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete game' }));
    expect(screen.getByText('Delete this game?')).not.toBeNull();
    expect(confirmed).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(confirmed).toBe(true));
  });
});
