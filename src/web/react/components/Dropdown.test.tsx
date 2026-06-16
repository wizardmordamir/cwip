import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dropdown, type DropdownOption, nextEnabledIndex } from './Dropdown';

const OPTS: DropdownOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', disabled: true },
  { value: 'c', label: 'Gamma' },
];

describe('nextEnabledIndex', () => {
  it('steps down, skipping disabled options', () => {
    expect(nextEnabledIndex(OPTS, 0, 1)).toBe(2); // a → (skip disabled b) → c
  });

  it('steps up, skipping disabled options', () => {
    expect(nextEnabledIndex(OPTS, 2, -1)).toBe(0); // c → (skip disabled b) → a
  });

  it('wraps around the ends', () => {
    expect(nextEnabledIndex(OPTS, 2, 1)).toBe(0); // past the end → first enabled
    expect(nextEnabledIndex(OPTS, 0, -1)).toBe(2); // before the start → last enabled
  });

  it('lands on the first enabled when starting from "nothing active" (-1)', () => {
    expect(nextEnabledIndex(OPTS, -1, 1)).toBe(0);
    expect(nextEnabledIndex(OPTS, OPTS.length, -1)).toBe(2);
  });

  it('returns -1 for an empty or all-disabled list', () => {
    expect(nextEnabledIndex([], 0, 1)).toBe(-1);
    expect(nextEnabledIndex([{ value: 'x', label: 'X', disabled: true }], 0, 1)).toBe(-1);
  });
});

describe('Dropdown (SSR)', () => {
  it('renders the selected option label on the closed trigger', () => {
    const html = renderToStaticMarkup(<Dropdown options={OPTS} value="c" onChange={() => {}} aria-label="Pick" />);
    expect(html).toContain('Gamma');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-label="Pick"');
    // Closed by default: the listbox isn't in the markup yet.
    expect(html).not.toContain('role="listbox"');
  });

  it('shows the placeholder when nothing is selected', () => {
    const html = renderToStaticMarkup(
      <Dropdown options={OPTS} value={null} onChange={() => {}} placeholder="Choose one" />,
    );
    expect(html).toContain('Choose one');
  });
});
