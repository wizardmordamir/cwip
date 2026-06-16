// Accent-color palette + contrast helper shared by the nav toolkit (sidebar
// rows, the kebab menu, and hub tiles). Moved here from the apps' hand-copied
// `ColorPicker`/`HubTileColorPicker` so there's one palette/one luminance pick.

/** A curated palette of saturated, light/dark-friendly accent colors. */
export const NAV_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;

/**
 * Relative-luminance contrast pick: returns a near-black or near-white that reads
 * against `hex`, so a solid swatch of ANY chosen color keeps a legible glyph.
 */
export const readableTextOn = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = Number.parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? '#111827' : '#ffffff';
};
