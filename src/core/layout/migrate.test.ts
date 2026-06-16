import { describe, expect, test } from 'bun:test';
import { migrateLayoutConfig, migrateLayoutView } from './migrate';
import type { ListLayoutConfig } from './types';

describe('migrateLayoutConfig', () => {
  test('empty / junk input → bare v2 config', () => {
    expect(migrateLayoutConfig({})).toEqual({ version: 2 });
    expect(migrateLayoutConfig(null)).toEqual({ version: 2 });
    expect(migrateLayoutConfig('nonsense')).toEqual({ version: 2 });
    expect(migrateLayoutConfig(undefined)).toEqual({ version: 2 });
  });

  test('upgrades a real v1 config (the one stored layout) losslessly', () => {
    const v1 = {
      card: {
        enabled: true,
        blocks: [
          { key: 'task', width: 'full', variant: 'title' },
          { key: 'done', width: 'full', variant: 'badge', accent: 'emerald' },
          { key: 'due', width: 'full' },
          { key: 'priority', width: 'half', variant: 'badge', accent: 'amber', hideLabel: true },
          { key: 'notes', width: 'full', variant: 'subtle' },
        ],
      },
      detail: { enabled: false, blocks: [] },
    };
    const v2 = migrateLayoutConfig(v1);
    expect(v2.version).toBe(2);
    expect(v2.card?.enabled).toBe(true);
    expect(v2.card?.nodes).toHaveLength(5);

    expect(v2.card?.nodes[0]).toMatchObject({
      type: 'title',
      binding: { kind: 'column', key: 'task' },
      width: 'full',
    });
    expect(v2.card?.nodes[1]).toMatchObject({
      type: 'badge',
      binding: { kind: 'column', key: 'done' },
      style: { tone: 'emerald' },
    });
    // blank variant → default keyValue widget
    expect(v2.card?.nodes[2]).toMatchObject({ type: 'keyValue', width: 'full' });
    expect(v2.card?.nodes[3]).toMatchObject({
      type: 'badge',
      width: 'half',
      hideLabel: true,
      style: { tone: 'amber' },
    });
    expect(v2.card?.nodes[4]).toMatchObject({ type: 'subtitle' });
    expect(v2.detail).toEqual({ enabled: false, nodes: [] });
    // every node gets a stable id
    for (const n of v2.card?.nodes ?? []) expect(typeof n.id).toBe('string');
  });

  test('image variant → imageHero, unknown accent dropped', () => {
    const v2 = migrateLayoutView({
      enabled: true,
      blocks: [{ key: 'photo', width: 'full', variant: 'image', accent: 'chartreuse' }],
    });
    expect(v2.nodes[0]).toMatchObject({
      type: 'imageHero',
      binding: { kind: 'column', key: 'photo' },
    });
    expect(v2.nodes[0].style).toBeUndefined();
  });

  test('v1 junk: bad width → full, keyless blocks dropped', () => {
    const v2 = migrateLayoutView({
      enabled: 'yes',
      blocks: [
        { key: 'title', width: 'enormous' },
        { width: 'half' }, // no key → dropped
        { key: 'status' },
      ],
    });
    expect(v2.enabled).toBe(true);
    expect(v2.nodes).toHaveLength(2);
    expect(v2.nodes[0].width).toBe('full');
  });

  test('v2 passthrough: normalizes nodes (bad width, missing binding, depth clamp)', () => {
    const v2 = migrateLayoutView({
      enabled: true,
      nodes: [
        { id: 'a', type: 'title', binding: { kind: 'column', key: 'x' }, width: 'wat', span: 99 },
        { id: 'b', type: 'badge' }, // no binding → coerced to static
        {
          id: 'c',
          type: 'section',
          binding: { kind: 'static' },
          children: [
            {
              id: 'c1',
              type: 'section',
              binding: { kind: 'static' },
              children: [
                {
                  id: 'c2',
                  type: 'section',
                  binding: { kind: 'static' },
                  children: [
                    {
                      id: 'c3',
                      type: 'section',
                      binding: { kind: 'static' },
                      // c4 is at the max depth; its own children must be pruned.
                      children: [
                        {
                          id: 'c4',
                          type: 'section',
                          binding: { kind: 'static' },
                          children: [{ id: 'c5', type: 'title', binding: { kind: 'static' } }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(v2.nodes[0].width).toBeUndefined(); // 'wat' dropped
    expect(v2.nodes[0].span).toBeUndefined(); // 99 dropped
    expect(v2.nodes[1].binding).toEqual({ kind: 'static' });
    // depth clamp: levels 0–4 (c…c4) survive; c4's children (the 6th level) are pruned.
    const c4 = v2.nodes[2].children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
    expect(c4?.id).toBe('c4');
    expect(c4?.children).toBeUndefined();
  });

  test('detail given a non-object is omitted entirely', () => {
    const v2 = migrateLayoutConfig({ card: { enabled: true, blocks: [] }, detail: 'nonsense' });
    expect(v2.card).toBeDefined();
    expect(v2.detail).toBeUndefined();
  });

  test('is idempotent: migrate(migrate(x)) deep-equals migrate(x)', () => {
    const inputs: unknown[] = [
      {},
      {
        card: {
          enabled: true,
          blocks: [{ key: 'a', width: 'half', variant: 'badge', accent: 'sky' }],
        },
      },
      {
        version: 2,
        card: {
          enabled: true,
          nodes: [{ id: 'z', type: 'title', binding: { kind: 'column', key: 'a' }, width: 'full' }],
        },
        dashboard: {
          enabled: true,
          nodes: [{ id: 'k', type: 'kpi', binding: { kind: 'aggregate', metric: 'count' } }],
        },
      },
    ];
    for (const input of inputs) {
      const once: ListLayoutConfig = migrateLayoutConfig(input);
      const twice: ListLayoutConfig = migrateLayoutConfig(once);
      expect(twice).toEqual(once);
    }
  });
});
