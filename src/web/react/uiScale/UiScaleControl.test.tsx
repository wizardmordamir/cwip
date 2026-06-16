import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { UiScaleControl } from './UiScaleControl';

describe('UiScaleControl', () => {
  it('renders the preset labels, the steppers, and the default readout', () => {
    const html = renderToStaticMarkup(<UiScaleControl />);
    for (const label of ['Small', 'Default', 'Large', 'Larger', 'Largest']) expect(html).toContain(label);
    // labeled, accessible steppers
    expect(html).toContain('Decrease UI size');
    expect(html).toContain('Increase UI size');
    // SSR renders the default scale
    expect(html).toContain('100%');
  });

  it('can hide the stepper and the value', () => {
    const html = renderToStaticMarkup(<UiScaleControl showStepper={false} showValue={false} />);
    expect(html).not.toContain('Decrease UI size');
    expect(html).not.toContain('100%');
    expect(html).toContain('Default'); // presets still render
  });
});
