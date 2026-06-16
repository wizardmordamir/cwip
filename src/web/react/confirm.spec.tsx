import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { type ConfirmFn, createConfirmContext, guardWithConfirm } from './confirm';

const yes: ConfirmFn = async () => true;
const no: ConfirmFn = async () => false;

describe('guardWithConfirm', () => {
  it('runs the action when the user confirms', async () => {
    let ran = false;
    await guardWithConfirm(yes, 'Delete?', () => {
      ran = true;
    })();
    expect(ran).toBe(true);
  });

  it('does NOT run the action when the user declines', async () => {
    let ran = false;
    await guardWithConfirm(no, 'Delete?', () => {
      ran = true;
    })();
    expect(ran).toBe(false);
  });

  it('forwards the handler args to the action', async () => {
    const seen: unknown[] = [];
    await guardWithConfirm(yes, 'Delete?', (...args: unknown[]) => {
      seen.push(...args);
    })('a', 42);
    expect(seen).toEqual(['a', 42]);
  });

  it('passes the options straight through to the confirm fn', async () => {
    let received: unknown;
    const spyConfirm: ConfirmFn = async (opts) => {
      received = opts;
      return true;
    };
    await guardWithConfirm(spyConfirm, { prompt: 'Remove?', confirmText: 'Remove' }, () => {})();
    expect(received).toEqual({ prompt: 'Remove?', confirmText: 'Remove' });
  });

  it('is a safe no-op when no action is given and the user declines', async () => {
    await expect(guardWithConfirm(no, 'Delete?')()).resolves.toBeUndefined();
  });
});

describe('createConfirmContext bound buttons', () => {
  // A no-op dialog is fine for SSR — we only assert the trigger buttons render.
  const { ConfirmButton, ConfirmIconButton } = createConfirmContext(() => null);

  it('ConfirmButton renders a <button> with its children', () => {
    const html = renderToStaticMarkup(
      <ConfirmButton variant="danger" confirm="Delete this?" onConfirm={() => {}}>
        Remove game
      </ConfirmButton>,
    );
    expect(html).toContain('<button');
    expect(html).toContain('Remove game');
  });

  it('ConfirmIconButton renders a labeled icon <button>', () => {
    const html = renderToStaticMarkup(
      <ConfirmIconButton label="Delete game" confirm="Delete this game?" onConfirm={() => {}}>
        ✕
      </ConfirmIconButton>,
    );
    expect(html).toContain('aria-label="Delete game"');
    expect(html).toContain('✕');
  });
});
