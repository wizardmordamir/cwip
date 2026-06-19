import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { PageBottom, type PageBottomSpaceValue, usePageBottomSpace } from './PageBottom';

// PageBottom renders an aria-hidden spacer at the end of a page; the height is
// driven by `--page-bottom-space` / `--page-bottom-space-md` with the `space`
// preset baked in as the CSS-var fallback, and `usePageBottomSpace` overrides
// those vars on `<html>` for a single page. We assert the markup and the var
// side-effects directly (happy-dom applies no Tailwind, so computed height isn't
// meaningful here — the class compilation is verified against the real toolchain).

const spacerOf = (container: HTMLElement): HTMLElement => {
  const el = container.querySelector('[aria-hidden="true"]');
  if (!el) throw new Error('PageBottom rendered no spacer');
  return el as HTMLElement;
};

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('style');
});

describe('PageBottom', () => {
  it('renders an aria-hidden, pointer-events-none spacer after its children', () => {
    const { container } = render(
      <PageBottom>
        <p>page body</p>
      </PageBottom>,
    );
    const body = container.querySelector('p');
    if (!body) throw new Error('PageBottom rendered no children');
    const spacer = spacerOf(container);
    expect(body.textContent).toBe('page body');
    // The spacer must come AFTER the content so it adds clearance below it.
    expect(body.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(spacer.className).toContain('pointer-events-none');
    expect(spacer.className).toContain('shrink-0');
  });

  it('defaults to the universal spacing (33vh / 6rem) as the CSS-var fallback', () => {
    const { container } = render(<PageBottom />);
    const cls = spacerOf(container).className;
    expect(cls).toContain('h-[var(--page-bottom-space,33vh)]');
    expect(cls).toContain('md:h-[var(--page-bottom-space-md,calc(6rem+');
    // Desktop fallback keeps the keyboard inset so typing still scrolls clear.
    expect(cls).toContain('var(--keyboard-inset,0px)');
  });

  it('honours the `space` prop for a larger default (roomy)', () => {
    const { container } = render(<PageBottom space="roomy" />);
    const cls = spacerOf(container).className;
    expect(cls).toContain('h-[var(--page-bottom-space,50vh)]');
    expect(cls).toContain('md:h-[var(--page-bottom-space-md,calc(10rem+');
  });

  it('honours the `space` prop for no clearance (none)', () => {
    const { container } = render(<PageBottom space="none" />);
    const cls = spacerOf(container).className;
    expect(cls).toContain('h-[var(--page-bottom-space,0px)]');
    expect(cls).toContain('md:h-[var(--page-bottom-space-md,0px)]');
  });
});

// Tiny probe component so the hook runs inside a real render/effect.
const Probe = ({ space }: { space: Parameters<typeof usePageBottomSpace>[0] }) => {
  usePageBottomSpace(space);
  return null;
};

const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('usePageBottomSpace', () => {
  it('publishes a preset override onto <html> and reverts on unmount', () => {
    const { unmount } = render(<Probe space="roomy" />);
    expect(rootVar('--page-bottom-space')).toBe('50vh');
    expect(rootVar('--page-bottom-space-md')).toContain('calc(10rem +');
    unmount();
    expect(rootVar('--page-bottom-space')).toBe('');
    expect(rootVar('--page-bottom-space-md')).toBe('');
  });

  it('accepts an explicit { base, md } height pair', () => {
    const custom: PageBottomSpaceValue = { base: '200px', md: '120px' };
    const { unmount } = render(<Probe space={custom} />);
    expect(rootVar('--page-bottom-space')).toBe('200px');
    expect(rootVar('--page-bottom-space-md')).toBe('120px');
    unmount();
  });

  it('does nothing when given null (keeps the shell default)', () => {
    render(<Probe space={null} />);
    expect(rootVar('--page-bottom-space')).toBe('');
    expect(rootVar('--page-bottom-space-md')).toBe('');
  });

  it('updates the override when the requested space changes', () => {
    const { rerender } = render(<Probe space="compact" />);
    expect(rootVar('--page-bottom-space')).toBe('16vh');
    rerender(<Probe space="roomy" />);
    expect(rootVar('--page-bottom-space')).toBe('50vh');
  });
});
