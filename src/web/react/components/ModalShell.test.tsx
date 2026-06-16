import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModalShell } from './ModalShell';

// The canonical dialog: backdrop click-to-close + Escape-to-close + an optional
// header close button, with a "discard unsaved edits?" guard. These lock the soft-
// dismiss paths and the guard branch that the SSR specs can't reach.
describe('ModalShell soft-dismiss', () => {
  it('closes when the backdrop is clicked', () => {
    let closed = 0;
    render(
      <ModalShell onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    // No header → the backdrop is the only "Close" affordance.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(closed).toBe(1);
  });

  it('closes when the header close button is clicked', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit thing" onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    // With a title there are two "Close" controls: [0] backdrop, [1] header button.
    const closers = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closers[closers.length - 1]);
    expect(closed).toBe(1);
  });

  it('closes on Escape', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit thing" onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closed).toBe(1);
  });
});

describe('ModalShell discard guard', () => {
  it('closes immediately on soft dismiss when the guard is on but the form is clean', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit" confirmOnClose dirty={false} onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closed).toBe(1);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('shows the discard prompt instead of closing when dirty', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit" confirmOnClose dirty onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closed).toBe(0);
    expect(screen.getByText('Discard changes?')).not.toBeNull();
  });

  it('"Keep editing" dismisses the prompt without closing the modal', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit" confirmOnClose dirty onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    // The overlay backdrop also carries the "Keep editing" name; target the visible
    // button by its text so the match is unambiguous.
    fireEvent.click(screen.getByText('Keep editing'));
    expect(closed).toBe(0);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('"Discard" closes the modal', () => {
    let closed = 0;
    render(
      <ModalShell title="Edit" confirmOnClose dirty onClose={() => closed++}>
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.click(screen.getByText('Discard'));
    expect(closed).toBe(1);
  });

  it('offers a Save button in the prompt only when onSave is given', () => {
    let saved = 0;
    let closed = 0;
    render(
      <ModalShell
        title="Edit"
        confirmOnClose
        dirty
        onClose={() => closed++}
        onSave={() => {
          saved++;
        }}
        saveText="Save it"
      >
        <p>body</p>
      </ModalShell>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.click(screen.getByText('Save it'));
    expect(saved).toBe(1);
    // Saving keeps editing (it doesn't discard); closing is the parent's job post-save.
    expect(closed).toBe(0);
  });
});
