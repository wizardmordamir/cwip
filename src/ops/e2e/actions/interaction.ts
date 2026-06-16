import { act } from '../act';
import { resolveTarget } from '../resolve';
import type { E2EAction, Target } from '../types';

/** Click a target (Playwright auto-waits for actionability up to the action timeout). */
export const click = (target: Target): E2EAction =>
  act(
    'click',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config).first().click({ timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Click the first element containing `text` (a button/link fallback when there's no test-id). */
export const clickText = (text: string): E2EAction =>
  act(
    'clickText',
    async (ctx) => {
      await ctx.page.getByText(text).first().click({ timeout: ctx.config.timeouts.action });
    },
    { text },
  );

/** Clear and set the value of an input/textarea. */
export const fill = (target: Target, value: string): E2EAction =>
  act(
    'fill',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config).first().fill(value, { timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Type into a target key-by-key (use when an input reacts to each keystroke). */
export const type = (target: Target, value: string, opts?: { delay?: number }): E2EAction =>
  act(
    'type',
    async (ctx) => {
      const loc = resolveTarget(ctx.page, target, ctx.config).first();
      await loc.pressSequentially(value, { timeout: ctx.config.timeouts.action, delay: opts?.delay });
    },
    target,
  );

/** Press a key — globally, or focused on a target. */
export const press = (key: string, target?: Target): E2EAction =>
  act(
    'press',
    async (ctx) => {
      if (target)
        await resolveTarget(ctx.page, target, ctx.config).first().press(key, { timeout: ctx.config.timeouts.action });
      else await ctx.page.keyboard.press(key);
    },
    target,
  );

/** Set files on a file input. Accepts paths or in-memory `{ name, mimeType, buffer }`. */
export const setFiles = (
  target: Target,
  files:
    | string
    | string[]
    | { name: string; mimeType: string; buffer: Buffer }
    | Array<{ name: string; mimeType: string; buffer: Buffer }>,
): E2EAction =>
  act(
    'setFiles',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .setInputFiles(files, { timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Check or uncheck a checkbox/switch. */
export const check = (target: Target, checked = true): E2EAction =>
  act(
    'check',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .setChecked(checked, { timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Select option(s) in a `<select>` by value/label/index. */
export const selectOption = (
  target: Target,
  values: string | string[] | { label?: string; value?: string; index?: number },
): E2EAction =>
  act(
    'selectOption',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config)
        .first()
        .selectOption(values, { timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Blur a target (e.g. commit an inline edit that saves on blur). */
export const blur = (target: Target): E2EAction =>
  act(
    'blur',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config).first().blur({ timeout: ctx.config.timeouts.action });
    },
    target,
  );

/** Hover a target (reveals hover-only controls). */
export const hover = (target: Target): E2EAction =>
  act(
    'hover',
    async (ctx) => {
      await resolveTarget(ctx.page, target, ctx.config).first().hover({ timeout: ctx.config.timeouts.action });
    },
    target,
  );
