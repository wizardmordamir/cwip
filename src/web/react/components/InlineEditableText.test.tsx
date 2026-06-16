import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { InlineEditableText } from './InlineEditableText';

// Click-to-edit: shows a button, becomes an input/textarea on click. Enter/blur
// commit, Escape cancels. `value` is parent-controlled, so after commit the display
// still shows the original prop — these assert the onSave callback contract.
describe('InlineEditableText (single-line)', () => {
  it('shows a button by default and swaps to an input on click', () => {
    render(<InlineEditableText value="Title" onSave={() => {}} ariaLabel="Edit title" />);
    const button = screen.getByRole('button', { name: 'Title' });
    expect(button).not.toBeNull();

    fireEvent.click(button);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Title');
  });

  it('commits the trimmed new value on Enter', () => {
    const saves: string[] = [];
    render(<InlineEditableText value="Old" onSave={(next) => saves.push(next)} ariaLabel="Edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Old' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  New  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saves).toEqual(['New']);
    // Editor is gone (back to display mode).
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('commits on blur', () => {
    const saves: string[] = [];
    render(<InlineEditableText value="Old" onSave={(next) => saves.push(next)} ariaLabel="Edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Old' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Edited' } });
    fireEvent.blur(input);
    expect(saves).toEqual(['Edited']);
  });

  it('does NOT save when Escape cancels — reverting the draft', () => {
    let saveCount = 0;
    render(<InlineEditableText value="Old" onSave={() => saveCount++} ariaLabel="Edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Old' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(saveCount).toBe(0);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('does NOT call onSave when the value is unchanged', () => {
    let saveCount = 0;
    render(<InlineEditableText value="Same" onSave={() => saveCount++} ariaLabel="Edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Same' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(saveCount).toBe(0);
  });

  it('renders plain text (no button) when canEdit is false', () => {
    render(<InlineEditableText value="Read only" onSave={() => {}} canEdit={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Read only')).not.toBeNull();
  });
});

describe('InlineEditableText (multiline)', () => {
  it('commits on Cmd/Ctrl+Enter but a bare Enter inserts a newline (no commit)', () => {
    const saves: string[] = [];
    render(<InlineEditableText multiline value="Body" onSave={(next) => saves.push(next)} ariaLabel="Edit body" />);
    fireEvent.click(screen.getByRole('button', { name: 'Body' }));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } });

    // Bare Enter must not commit (it's a newline in a textarea).
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(saves).toHaveLength(0);
    expect(screen.queryByRole('textbox')).not.toBeNull();

    // Cmd+Enter commits.
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
    expect(saves).toEqual(['Line 1\nLine 2']);
  });
});
