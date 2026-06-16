import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Button,
  ButtonLink,
  Checkbox,
  FieldLabel,
  getButtonClasses,
  IconButton,
  Input,
  Select,
  Switch,
  TextArea,
} from '.';

describe('getButtonClasses', () => {
  it('composes base + variant and merges a custom class', () => {
    const cls = getButtonClasses({ variant: 'accent', className: 'mt-2' });
    expect(cls).toContain('bg-accent');
    expect(cls).toContain('mt-2');
  });

  it('uses the muted disabled style instead of the variant fill', () => {
    const cls = getButtonClasses({ variant: 'danger', disabled: true });
    expect(cls).not.toContain('bg-red-600');
    expect(cls).toContain('cursor-not-allowed');
  });
});

describe('Button', () => {
  it('renders children + text and the variant class', () => {
    const html = renderToStaticMarkup(
      <Button variant="success" text="!">
        Save
      </Button>,
    );
    expect(html).toContain('Save');
    expect(html).toContain('!');
    expect(html).toContain('bg-green-600');
  });

  it('merges a root-slot class override', () => {
    const html = renderToStaticMarkup(<Button classNames={{ root: 'custom-x' }}>x</Button>);
    expect(html).toContain('custom-x');
  });

  it('drops the visual default under unstyled but keeps a string override', () => {
    const html = renderToStaticMarkup(
      <Button unstyled classNames={{ root: 'only-this' }}>
        x
      </Button>,
    );
    expect(html).toContain('only-this');
    expect(html).not.toContain('bg-gray-900');
  });
});

describe('ButtonLink', () => {
  it('renders an anchor with href by default', () => {
    const html = renderToStaticMarkup(<ButtonLink to="/home">Home</ButtonLink>);
    expect(html).toContain('href="/home"');
    expect(html).toContain('Home');
  });
});

describe('form controls', () => {
  it('Input carries the shared field class', () => {
    expect(renderToStaticMarkup(<Input placeholder="name" />)).toContain('rounded-lg');
  });

  it('Select renders options without w-full', () => {
    const html = renderToStaticMarkup(
      <Select>
        <option>a</option>
      </Select>,
    );
    expect(html).toContain('<option>a</option>');
    expect(html).not.toContain('w-full');
  });

  it('TextArea renders a textarea', () => {
    expect(renderToStaticMarkup(<TextArea defaultValue="hi" />)).toContain('<textarea');
  });

  it('IconButton sets aria-label and title', () => {
    const html = renderToStaticMarkup(<IconButton label="Close">x</IconButton>);
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain('title="Close"');
  });

  it('Checkbox reflects checked + label', () => {
    const html = renderToStaticMarkup(<Checkbox label="Agree" checked readOnly />);
    expect(html).toContain('Agree');
    expect(html).toContain('checked');
  });

  it('Switch reflects the checked state on the track', () => {
    expect(renderToStaticMarkup(<Switch checked onChange={() => {}} />)).toContain('bg-accent');
    expect(renderToStaticMarkup(<Switch checked={false} onChange={() => {}} />)).toContain('bg-gray-400');
  });

  it('IconButton shows the native title by default but defers to a rich tooltip', () => {
    // No `tooltip`: the label doubles as the native title.
    expect(renderToStaticMarkup(<IconButton label="Close">x</IconButton>)).toContain('title="Close"');
    // With `tooltip`: the styled bubble owns the hover text, so no duplicate title;
    // `label` still names it for a11y.
    const rich = renderToStaticMarkup(
      <IconButton label="Close" tooltip="Discards unsaved edits">
        x
      </IconButton>,
    );
    expect(rich).not.toContain('title="Close"');
    expect(rich).toContain('aria-label="Close"');
  });

  it('Button wraps itself in a tooltip trigger only when tooltip is set', () => {
    // The Tooltip wrapper is a positioned inline span; a plain button has none.
    expect(renderToStaticMarkup(<Button>Plain</Button>)).not.toContain('position:relative');
    expect(renderToStaticMarkup(<Button tooltip="why this matters">Act</Button>)).toContain('position:relative');
  });

  it('FieldLabel renders a label element and an info hint when given', () => {
    const html = renderToStaticMarkup(<FieldLabel>Name</FieldLabel>);
    expect(html).toContain('<span');
    expect(html).toContain('Name');
    // `hint` adds the InfoHint icon (defaulting its title to the string caption).
    const hinted = renderToStaticMarkup(<FieldLabel hint="the user's full name">Name</FieldLabel>);
    expect(hinted).toContain('aria-label="Help: Name"');
  });
});
