// Flatten an arbitrary stored value (string, number, array, nested object) to a
// single line of searchable / displayable text. Arrays join their flattened items
// with ", "; objects prefer a label/name/title field, else fall back to JSON. Used
// by every search source mapper so matching + snippets see the same text.
export const valueToText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(valueToText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const label = o.label ?? o.name ?? o.title;
    return label != null ? String(label) : JSON.stringify(v);
  }
  return String(v);
};
