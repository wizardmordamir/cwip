import { describe, expect, it } from 'bun:test';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CopyButton,
  cx,
  ErrorBoundary,
  InfoHint,
  resolveClass,
  resolveStyle,
  Spinner,
  Toast,
  ToastList,
  Tooltip,
  withErrorBoundary,
} from '.';

// renderToStaticMarkup (legacy SSR) re-throws render errors rather than routing
// them through boundaries, so the caught-state path is driven via render() with
// the post-catch state injected — exactly the state getDerivedStateFromError sets.
const caughtRender = (props: ConstructorParameters<typeof ErrorBoundary>[0]): string => {
  const eb = new ErrorBoundary(props);
  eb.state = { didCatch: true, error: new Error('kaboom') };
  return renderToStaticMarkup(eb.render() as ReactElement);
};

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <span>all good</span>
      </ErrorBoundary>,
    );
    expect(html).toContain('all good');
  });

  it('getDerivedStateFromError flips into the caught state', () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error('x'))).toEqual({
      didCatch: true,
      error: expect.any(Error),
    });
  });

  it('renders a static fallback in the caught state', () => {
    expect(caughtRender({ fallback: <span>fell back</span> })).toContain('fell back');
  });

  it('passes the error to fallbackRender', () => {
    expect(caughtRender({ fallbackRender: ({ error }) => <span>caught: {error.message}</span> })).toContain(
      'caught: kaboom',
    );
  });
});

describe('withErrorBoundary', () => {
  it('wraps a component and sets a descriptive displayName', () => {
    function Widget() {
      return <i>widget</i>;
    }
    const Wrapped = withErrorBoundary(Widget, { fallback: <b>oops</b> });
    expect(Wrapped.displayName).toBe('withErrorBoundary(Widget)');
    expect(renderToStaticMarkup(<Wrapped />)).toContain('widget');
  });
});

describe('Spinner', () => {
  it('renders an accessible svg', () => {
    const html = renderToStaticMarkup(<Spinner label="Loading users" />);
    expect(html).toContain('<svg');
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading users');
  });
});

describe('Tooltip', () => {
  it('renders the trigger and hides the bubble by default', () => {
    const html = renderToStaticMarkup(
      <Tooltip content="Copy">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    expect(html).toContain('Copy</button>');
    expect(html).not.toContain('role="tooltip"');
  });
});

describe('InfoHint', () => {
  it('renders the icon trigger and keeps the panel closed by default', () => {
    const html = renderToStaticMarkup(<InfoHint title="Env key">maps to a server var</InfoHint>);
    expect(html).toContain('aria-label="Help: Env key"');
    expect(html).toContain('<svg');
    // Closed until hovered/clicked, so neither the panel nor its body renders.
    expect(html).not.toContain('role="tooltip"');
    expect(html).not.toContain('maps to a server var');
  });

  it('merges per-slot classNames and the className root shortcut, generic label without a title', () => {
    const html = renderToStaticMarkup(
      <InfoHint className="my-wrap" classNames={{ icon: 'my-icon' }}>
        body
      </InfoHint>,
    );
    expect(html).toContain('my-icon');
    expect(html).toContain('cursor-help'); // string override MERGES with the default
    expect(html).toContain('my-wrap');
    expect(html).toContain('aria-label="More info"');
  });

  it('a function classNames override replaces the slot default, and unstyled drops the visual classes', () => {
    const replaced = renderToStaticMarkup(<InfoHint classNames={{ icon: () => 'solo' }}>body</InfoHint>);
    expect(replaced).toContain('class="solo"');
    expect(replaced).not.toContain('cursor-help');

    const bare = renderToStaticMarkup(
      <InfoHint unstyled classNames={{ icon: 'only-this' }}>
        body
      </InfoHint>,
    );
    expect(bare).toContain('class="only-this"');
    expect(bare).not.toContain('cursor-help');
  });

  it('unstyled keeps structural positioning; unstyled="all" drops it too', () => {
    // `true` drops the visual class layer but keeps the root's structural style.
    const kept = renderToStaticMarkup(<InfoHint unstyled>body</InfoHint>);
    expect(kept).toContain('position:relative');
    // `'all'` is the blank slate — no positioning either.
    const bare = renderToStaticMarkup(<InfoHint unstyled="all">body</InfoHint>);
    expect(bare).not.toContain('position:relative');
  });
});

describe('Toast', () => {
  it('renders a single toast message, a dismiss control, and the variant accent class', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: 'Saved', variant: 'success' }} onDismiss={() => {}} />,
    );
    expect(html).toContain('Saved');
    expect(html).toContain('aria-label="Dismiss"');
    expect(html).toContain('border-green-600'); // Tailwind-first variant accent
  });

  it('unstyled drops every default class across slots', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: 'Saved', variant: 'success' }} onDismiss={() => {}} unstyled />,
    );
    expect(html).not.toContain('border-green-600');
    expect(html).not.toContain('shadow-md');
  });

  it('renders a copy button for a string message and wraps long unbroken text', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: 'https://example.com/api/x?y=1 — 400 Bad Request' }} onDismiss={() => {}} />,
    );
    expect(html).toContain('aria-label="Copy message"');
    expect(html).toContain('break-words'); // long strings wrap instead of overflowing
    expect(html).toContain('min-w-0'); // message can shrink below content width
  });

  it('omits the copy button for a non-string message and when showCopy is false', () => {
    const nonString = renderToStaticMarkup(<Toast toast={{ id: '1', message: <b>rich</b> }} onDismiss={() => {}} />);
    expect(nonString).not.toContain('Copy message');
    const optedOut = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: 'plain' }} onDismiss={() => {}} showCopy={false} />,
    );
    expect(optedOut).not.toContain('Copy message');
  });

  it('copies copyText when provided even for a rich message', () => {
    const html = renderToStaticMarkup(
      <Toast toast={{ id: '1', message: <b>rich</b>, copyText: 'the raw error' }} onDismiss={() => {}} />,
    );
    expect(html).toContain('aria-label="Copy message"');
  });

  it('ToastList renders every toast', () => {
    const html = renderToStaticMarkup(
      <ToastList
        toasts={[
          { id: '1', message: 'one' },
          { id: '2', message: 'two' },
        ]}
        onDismiss={() => {}}
      />,
    );
    expect(html).toContain('one');
    expect(html).toContain('two');
  });
});

describe('CopyButton', () => {
  it('renders a labeled copy button (aria + native title) with no tooltip wrapper by default', () => {
    const html = renderToStaticMarkup(<CopyButton text="hello" />);
    expect(html).toContain('aria-label="Copy to clipboard"');
    expect(html).toContain('title="Copy to clipboard"');
    expect(html).toContain('<svg'); // the copy icon
    expect(html).not.toContain('role="tooltip"'); // closed/native by default
  });

  it('drops the native title and wraps in a styled tooltip trigger when tooltip is set', () => {
    const html = renderToStaticMarkup(<CopyButton text="hello" tooltip="Copy it" />);
    expect(html).toContain('aria-label="Copy to clipboard"');
    expect(html).not.toContain('title="Copy to clipboard"');
  });

  it('unstyled drops the default button classes', () => {
    const html = renderToStaticMarkup(<CopyButton text="hello" unstyled classNames={{ root: 'only-this' }} />);
    expect(html).toContain('class="only-this"');
    expect(html).not.toContain('cursor-pointer');
  });

  it('renders a visible label alongside the icon', () => {
    const html = renderToStaticMarkup(<CopyButton text="hello">Copy code</CopyButton>);
    expect(html).toContain('Copy code');
    expect(html).toContain('<svg'); // icon still present by default
  });

  it('showIcon=false drops the icon for a text-only button', () => {
    const html = renderToStaticMarkup(
      <CopyButton text="hello" showIcon={false}>
        Copy
      </CopyButton>,
    );
    expect(html).toContain('Copy');
    expect(html).not.toContain('<svg');
  });

  it('accepts a custom copy icon in place of the default', () => {
    const html = renderToStaticMarkup(<CopyButton text="hello" copyIcon={<i className="my-icon" />} />);
    expect(html).toContain('my-icon');
    expect(html).not.toContain('<svg'); // default icon replaced
  });
});

describe('styling helpers', () => {
  it('cx joins truthy fragments only', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('resolveClass: string merges, function replaces, any truthy unstyled empties the default', () => {
    expect(resolveClass('base', 'extra')).toBe('base extra');
    expect(resolveClass('base', (d) => `${d} more`)).toBe('base more');
    expect(resolveClass('base', () => 'solo')).toBe('solo');
    expect(resolveClass('base', 'extra', true)).toBe('extra');
    expect(resolveClass('base', 'extra', 'all')).toBe('extra'); // both levels drop the visual class
    expect(resolveClass('base', () => 'solo', true)).toBe('solo');
    expect(resolveClass('base')).toBe('base');
  });

  it('resolveStyle: merges/replaces, keeps structure on `true`, drops only on `all`', () => {
    expect(resolveStyle({ color: 'red', margin: 1 }, { color: 'blue' })).toEqual({ color: 'blue', margin: 1 });
    expect(resolveStyle({ color: 'red' }, () => ({ padding: 2 }))).toEqual({ padding: 2 });
    // `true` keeps the structural default (positioning survives).
    expect(resolveStyle({ position: 'absolute' }, undefined, true)).toEqual({ position: 'absolute' });
    // `'all'` drops it.
    expect(resolveStyle({ position: 'absolute' }, undefined, 'all')).toBeUndefined();
    expect(resolveStyle({ position: 'absolute' }, { top: 0 }, 'all')).toEqual({ top: 0 });
    expect(resolveStyle({}, undefined)).toBeUndefined();
  });
});
