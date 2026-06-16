import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALERT_ICONS, Alert } from '.';

describe('Alert', () => {
  it('applies the tone container classes and a polite status role by default', () => {
    const html = renderToStaticMarkup(<Alert tone="info">heads up</Alert>);
    expect(html).toContain('bg-sky-50');
    expect(html).toContain('border-sky-300');
    expect(html).toContain('role="status"');
    expect(html).toContain('heads up');
  });

  it('uses the assertive alert role for error and warning tones', () => {
    expect(renderToStaticMarkup(<Alert tone="error">boom</Alert>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Alert tone="warning">careful</Alert>)).toContain('role="alert"');
  });

  it('lets the role be overridden, including dropping it entirely', () => {
    expect(
      renderToStaticMarkup(
        <Alert tone="error" role="status">
          x
        </Alert>,
      ),
    ).toContain('role="status"');
    expect(
      renderToStaticMarkup(
        <Alert tone="error" role="none">
          x
        </Alert>,
      ),
    ).not.toContain('role=');
  });

  it('renders a bold title above the body', () => {
    const html = renderToStaticMarkup(
      <Alert tone="warning" title="Heads up">
        details here
      </Alert>,
    );
    expect(html).toContain('font-semibold');
    expect(html).toContain('Heads up');
    expect(html).toContain('details here');
  });

  it('shows the tone default glyph only when icon is true, never by default', () => {
    expect(renderToStaticMarkup(<Alert tone="error">x</Alert>)).not.toContain(ALERT_ICONS.error);
    expect(
      renderToStaticMarkup(
        <Alert tone="error" icon>
          x
        </Alert>,
      ),
    ).toContain(ALERT_ICONS.error);
    expect(
      renderToStaticMarkup(
        <Alert tone="success" icon={<span>my-icon</span>}>
          x
        </Alert>,
      ),
    ).toContain('my-icon');
  });

  it('renders a dismiss button when onDismiss is provided', () => {
    const html = renderToStaticMarkup(
      <Alert tone="info" onDismiss={() => {}} dismissLabel="Close notice">
        x
      </Alert>,
    );
    expect(html).toContain('aria-label="Close notice"');
  });

  it('renders trailing actions', () => {
    const html = renderToStaticMarkup(
      <Alert tone="warning" actions={<button type="button">Fix it</button>}>
        problem
      </Alert>,
    );
    expect(html).toContain('Fix it');
  });

  it('honors the small size and per-slot class overrides', () => {
    const html = renderToStaticMarkup(
      <Alert tone="neutral" size="sm" classNames={{ root: 'my-root', content: () => 'only-content' }}>
        body
      </Alert>,
    );
    expect(html).toContain('text-xs');
    expect(html).toContain('my-root');
    expect(html).toContain('only-content');
  });

  it('drops the visual defaults under unstyled but keeps structure', () => {
    const html = renderToStaticMarkup(
      <Alert tone="error" unstyled>
        bare
      </Alert>,
    );
    expect(html).not.toContain('bg-red-50');
    expect(html).toContain('bare');
  });
});

describe('Alert dismiss interaction', () => {
  it('invokes onDismiss when the close button is clicked', () => {
    let dismissed = 0;
    render(
      <Alert tone="info" onDismiss={() => dismissed++} dismissLabel="Close notice">
        heads up
      </Alert>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close notice' }));
    expect(dismissed).toBe(1);
  });

  it('shows a dismiss button when dismissible even without an onDismiss handler', () => {
    render(
      <Alert tone="warning" dismissible dismissLabel="Hide">
        careful
      </Alert>,
    );
    // The button renders (clicking is just a no-op without onDismiss).
    expect(screen.getByRole('button', { name: 'Hide' })).not.toBeNull();
  });

  it('renders no dismiss button by default', () => {
    render(<Alert tone="success">all good</Alert>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
