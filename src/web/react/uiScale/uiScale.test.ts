import { describe, expect, test } from 'bun:test';
import {
  clampUiScale,
  DEFAULT_UI_SCALE,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  nearestUiScaleLevel,
  stepUiScale,
  UI_SCALE_LEVELS,
  uiScaleToFontSize,
} from './scale';
import { createUiScaleStore, type UiScaleStorage } from './uiScaleStore';

describe('scale model', () => {
  test('clamps to range and rounds; non-finite → default', () => {
    expect(clampUiScale(1.15)).toBe(1.15);
    expect(clampUiScale(5)).toBe(MAX_UI_SCALE);
    expect(clampUiScale(0.1)).toBe(MIN_UI_SCALE);
    expect(clampUiScale(Number.NaN)).toBe(DEFAULT_UI_SCALE);
  });

  test('stepUiScale nudges and clamps at the ends', () => {
    expect(stepUiScale(1, 1)).toBe(1.1);
    expect(stepUiScale(1, -1)).toBe(0.9);
    expect(stepUiScale(MAX_UI_SCALE, 1)).toBe(MAX_UI_SCALE);
    expect(stepUiScale(MIN_UI_SCALE, -1)).toBe(MIN_UI_SCALE);
  });

  test('nearestUiScaleLevel snaps to the closest preset', () => {
    expect(nearestUiScaleLevel(1).id).toBe('md');
    expect(nearestUiScaleLevel(1.12).id).toBe('lg'); // 1.15 is nearest
    expect(nearestUiScaleLevel(5).id).toBe('xxl'); // clamped then snapped
  });

  test('uiScaleToFontSize renders a percent so it composes with the browser base', () => {
    expect(uiScaleToFontSize(1)).toBe('100%');
    expect(uiScaleToFontSize(1.15)).toBe('115%');
    expect(uiScaleToFontSize(0.9)).toBe('90%');
  });

  test('every preset is within the supported range', () => {
    for (const l of UI_SCALE_LEVELS) {
      expect(l.scale).toBeGreaterThanOrEqual(MIN_UI_SCALE);
      expect(l.scale).toBeLessThanOrEqual(MAX_UI_SCALE);
    }
  });
});

/** A fake Web Storage for driving the store without a browser. */
function memStorage(seed: Record<string, string> = {}): UiScaleStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('uiScaleStore', () => {
  test('hydrates from storage, persists + applies on set, and notifies', () => {
    const storage = memStorage({ 'cwip.uiScale': '1.3' });
    const applied: number[] = [];
    const store = createUiScaleStore({ storage, apply: (s) => applied.push(s) });

    expect(store.get()).toBe(1.3); // hydrated
    let notified = 0;
    const off = store.subscribe(() => notified++);

    store.set(1.5);
    expect(store.get()).toBe(1.5);
    expect(storage.data['cwip.uiScale']).toBe('1.5'); // persisted
    expect(applied).toEqual([1.5]); // applied to the page
    expect(notified).toBe(1);

    store.step(1);
    expect(store.get()).toBe(1.6);
    store.reset();
    expect(store.get()).toBe(DEFAULT_UI_SCALE);

    off();
    store.set(1.2);
    expect(notified).toBe(3); // 3 notifications before unsubscribe (set, step, reset); none after
  });

  test('defaults when storage is empty/absent, and init() applies the saved value', () => {
    const applied: number[] = [];
    const store = createUiScaleStore({ storage: memStorage(), apply: (s) => applied.push(s) });
    expect(store.get()).toBe(DEFAULT_UI_SCALE);
    store.init();
    expect(applied).toEqual([DEFAULT_UI_SCALE]);
  });

  test('a corrupt stored value falls back to a clamped default', () => {
    const store = createUiScaleStore({ storage: memStorage({ 'cwip.uiScale': 'not-a-number' }) });
    expect(store.get()).toBe(DEFAULT_UI_SCALE);
  });
});
