import { parseDate } from '../../core/date';
import type { CellScalar, ComparisonOp, Condition, ConditionGroup } from './types';
import { DATE_OPS, UNARY_OPS } from './types';

// Resolve a date-ish value to a Date (or null). Accepts ISO-ish strings (2024,
// 2024-01, 2024-01-31, optional time) and the relative tokens 'today' / 'now' and
// '+Nd' / '-Nd' (N days from today). Kept strict (DATEISH) so plain text like
// "apple" is never coerced to a date. Parsing + comparisons are UTC-consistent:
// the engine compares dates at day granularity (see dayIndex), so the result is
// deterministic and independent of the server's timezone. (This replaced moment,
// which parsed bare dates as local midnight — identical for any dates more than a
// day apart; can differ only within ~24h of "now" in non-UTC zones.)
const DATEISH = /^\d{4}(-\d{1,2}(-\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?)?)?$/;

const toDate = (value: CellScalar): Date | null => {
  if (typeof value !== 'string') return null; // numbers aren't dates here (date cells arrive as ISO strings)
  const t = value.trim().toLowerCase();
  if (t === '') return null;
  if (t === 'today' || t === 'now') return new Date();
  const rel = /^([+-]\d+)d$/.exec(t);
  if (rel) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(rel[1]));
    return d;
  }
  if (!DATEISH.test(value.trim())) return null;
  return parseDate(value.trim()); // UTC by default; null when unparseable
};

// Whole-day index in UTC (days since the epoch) — the unit for day-granularity
// date ops, so two timestamps on the same calendar day compare equal.
const dayIndex = (d: Date): number => Math.floor(d.getTime() / 86_400_000);

const toNumber = (value: CellScalar): number | null => {
  if (value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const isEmptyScalar = (v: CellScalar): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const asText = (v: CellScalar): string => (v === null || v === undefined ? '' : String(v));

// Compare a single cell value against a condition. `rhs` is the resolved right-hand
// side (literal or another column's value for this row).
export const compare = (op: ComparisonOp, lhs: CellScalar, rhs: CellScalar): boolean => {
  if (UNARY_OPS.includes(op)) {
    return op === 'isEmpty' ? isEmptyScalar(lhs) : !isEmptyScalar(lhs);
  }
  if (DATE_OPS.includes(op)) {
    const a = toDate(lhs);
    const b = toDate(rhs);
    if (!a || !b) return false;
    const da = dayIndex(a);
    const db = dayIndex(b);
    switch (op) {
      case 'dateBefore':
        return da < db;
      case 'dateAfter':
        return da > db;
      case 'dateOnOrBefore':
        return da <= db;
      case 'dateOnOrAfter':
        return da >= db;
    }
  }
  switch (op) {
    case 'eq':
    case 'neq': {
      const na = toNumber(lhs);
      const nb = toNumber(rhs);
      const equal =
        na !== null && nb !== null ? na === nb : asText(lhs).trim().toLowerCase() === asText(rhs).trim().toLowerCase();
      return op === 'eq' ? equal : !equal;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const na = toNumber(lhs);
      const nb = toNumber(rhs);
      if (na === null || nb === null) return false;
      if (op === 'gt') return na > nb;
      if (op === 'gte') return na >= nb;
      if (op === 'lt') return na < nb;
      return na <= nb;
    }
    case 'contains':
      return asText(lhs).toLowerCase().includes(asText(rhs).toLowerCase());
    case 'notContains':
      return !asText(lhs).toLowerCase().includes(asText(rhs).toLowerCase());
    case 'startsWith':
      return asText(lhs).toLowerCase().startsWith(asText(rhs).toLowerCase());
    case 'endsWith':
      return asText(lhs).toLowerCase().endsWith(asText(rhs).toLowerCase());
    default:
      return false;
  }
};

// General ordering used by sortRows: numbers numerically, dates chronologically,
// everything else as case-insensitive strings. Blanks sort last.
export const compareValues = (a: CellScalar, b: CellScalar): number => {
  const aEmpty = isEmptyScalar(a);
  const bEmpty = isEmptyScalar(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // blanks sort last
  if (bEmpty) return -1;
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return na === nb ? 0 : na < nb ? -1 : 1;
  const ma = toDate(a);
  const mb = toDate(b);
  if (ma && mb && typeof a !== 'number' && typeof b !== 'number') {
    const ta = ma.getTime();
    const tb = mb.getTime();
    return ta === tb ? 0 : ta < tb ? -1 : 1;
  }
  const sa = asText(a).toLowerCase();
  const sb = asText(b).toLowerCase();
  return sa === sb ? 0 : sa < sb ? -1 : 1;
};

// True when a group carries no usable conditions — filter executors treat this as
// "select nothing" (a no-op) rather than the match-all that evalGroup returns, so
// an unconfigured filter never silently deletes every row.
export const groupIsEmpty = (group: ConditionGroup | undefined): boolean =>
  !group || ((group.all?.length ?? 0) === 0 && (group.any?.length ?? 0) === 0);

// `getCell` resolves a ColumnRef to this row's scalar (or null if unresolvable).
export type CellResolver = (ref: { byHeader?: string; byIndex?: number } | undefined) => CellScalar;

export const evalCondition = (cond: Condition, getCell: CellResolver): boolean => {
  const lhs = getCell(cond.column);
  const rhs = cond.valueColumn ? getCell(cond.valueColumn) : (cond.value ?? null);
  return compare(cond.op, lhs, rhs);
};

// An empty/absent group matches every row (a filter with no conditions is a no-op
// predicate that selects nothing to act on — callers treat "matches all = act on
// all"; see executors for how that's applied).
export const evalGroup = (group: ConditionGroup | undefined, getCell: CellResolver): boolean => {
  if (!group) return true;
  const all = group.all ?? [];
  const any = group.any ?? [];
  if (all.length === 0 && any.length === 0) return true;
  if (all.length > 0 && !all.every((c) => evalCondition(c, getCell))) return false;
  if (any.length > 0 && !any.some((c) => evalCondition(c, getCell))) return false;
  return true;
};
