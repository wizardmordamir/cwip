/*
  Zero-dependency date/time helpers.

  Timezone-aware behaviour is provided natively by `Intl.DateTimeFormat`
  (IANA zones, DST handled by the engine) plus plain `Date` arithmetic — no
  moment / moment-timezone required. Functions return native `Date` (an
  instant) or `string`; use `formatDate` to render a `Date` in any zone.

  When `Temporal` ships unflagged in Node/Bun, the internals here can be
  swapped for `Temporal.ZonedDateTime` without changing this public API.
*/

import { curry } from '../flow';
import { isString } from '../is';

export type DateLike = Date | string;

/** IANA time zone identifier, e.g. 'Etc/UTC' or 'America/New_York'. */
export type TimeZone = string;

export type TimeType = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

const UTC: TimeZone = 'Etc/UTC';
const EASTERN: TimeZone = 'America/New_York';

// https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/
// HH means military time 00 - 23, hh means 00 - 12
// no caps for minutes or seconds
export const dateFormatRegexes: Record<string, RegExp> = {
  'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
  'M/DD/YYYY': /^\d{1}\/\d{2}\/\d{4}$/,
  'MM/D/YYYY': /^\d{2}\/\d{1}\/\d{4}$/,
  'M/D/YYYY': /^\d{1}\/\d{1}\/\d{4}$/,
  'MM/DD/YY': /^\d{2}\/\d{2}\/\d{2}$/,
  'M/D/YY': /^\d{1}\/\d{1}\/\d{2}$/,
  'M/DD/YY': /^\d{1}\/\d{2}\/\d{2}$/,
  'MM/D/YY': /^\d{2}\/\d{1}\/\d{2}$/,
  'YYYY/MM/DD': /^\d{4}\/\d{2}\/\d{2}$/,
  'YYYY/M/DD': /^\d{4}\/\d{1}\/\d{2}$/,
  'YYYY/MM/D': /^\d{4}\/\d{2}\/\d{1}$/,

  'MM-DD-YYYY': /^\d{2}-\d{2}-\d{4}$/,
  'M-DD-YYYY': /^\d{1}-\d{2}-\d{4}$/,
  'MM-D-YYYY': /^\d{2}-\d{1}-\d{4}$/,
  'M-D-YYYY': /^\d{1}-\d{1}-\d{4}$/,
  'MM-DD-YY': /^\d{2}-\d{2}-\d{2}$/,
  'M-D-YY': /^\d{1}-\d{1}-\d{2}$/,
  'M-DD-YY': /^\d{1}-\d{2}-\d{2}$/,
  'MM-D-YY': /^\d{2}-\d{1}-\d{2}$/,
  'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
  'YYYY-M-DD': /^\d{4}-\d{1}-\d{2}$/,
  'YYYY-MM-D': /^\d{4}-\d{2}-\d{1}$/,

  'YYYY/MM/DD HH:mm:ss': /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/, // '2023/10/18 00:00:00'
  'YYYY/M/DD HH:mm:ss': /^\d{4}\/\d{1}\/\d{2} \d{2}:\d{2}:\d{2}$/, // '2023/1/5 00:00:00'
  'YYYY/MM/D HH:mm:ss': /^\d{4}\/\d{2}\/\d{1} \d{2}:\d{2}:\d{2}$/, // '2023/10/5 00:00:00'
  'YYYY/M/D HH:mm:ss': /^\d{4}\/\d{1}\/\d{1} \d{2}:\d{2}:\d{2}$/, // '2023/1/5 00:00:00'
  'YYYY-MM-DD HH:mm:ss': /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // '2023-10-18 00:00:00'
  'MMM D, YYYY': /^[a-zA-Z]{3,5} \d{1,2}, \d{4}$/, // MAY 5, 2023
  'MMMM D, YYYY': /^[a-zA-Z]{6,} \d{1,2}, \d{4}$/, // December 5, 2023
  'YYYY-MM-DDTHH:mm:ssZ': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, // 2024-02-24T13:01:01Z
  'YYYY-MM-DD HH:mm:ss.SSSSSSS': /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$/, // SQL timestamp with fractional seconds, 2025-10-07 03:40:50.8526802
};

// mutates the existing regexes object (dateFormatRegexes)
export const updateDateFormatRegexes = (newFormats: Record<string, RegExp>): Record<string, RegExp> => {
  Object.assign(dateFormatRegexes, newFormats);
  return dateFormatRegexes;
};

export const getTimeStringFormat = (dateString: string): string => {
  if (!isString(dateString)) {
    return '';
  }
  dateString = dateString.trim();
  return Object.keys(dateFormatRegexes).find((key) => dateFormatRegexes[key].test(dateString)) || '';
};

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));

// month name (full or 3+ letter abbreviation) -> 1-based month
const MONTH_INDEX: Record<string, number> = {};
MONTHS_LONG.forEach((name, i) => {
  MONTH_INDEX[name.toLowerCase()] = i + 1;
  MONTH_INDEX[name.slice(0, 3).toLowerCase()] = i + 1;
});

interface DateParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

const escapeRegex = (literal: string): string => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Tokens we understand, ordered so longer tokens win during scanning.
const TOKEN_RE = /YYYY|YY|MMMM|MMM|MM|DD|HH|mm|ss|S+|M|D|H/g;

const tokenToCapture = (token: string): string => {
  switch (token) {
    case 'YYYY':
      return '(\\d{4})';
    case 'YY':
      return '(\\d{2})';
    case 'MMMM':
    case 'MMM':
      return '([A-Za-z]+)';
    case 'MM':
    case 'DD':
    case 'HH':
    case 'mm':
    case 'ss':
      return '(\\d{2})';
    case 'M':
    case 'D':
    case 'H':
      return '(\\d{1,2})';
    default:
      return token[0] === 'S' ? '(\\d+)' : '';
  }
};

interface CompiledFormat {
  re: RegExp;
  tokens: string[];
}

const compiledFormats = new Map<string, CompiledFormat>();

const compileFormat = (format: string): CompiledFormat => {
  const cached = compiledFormats.get(format);
  if (cached) {
    return cached;
  }
  let pattern = '^';
  let lastIndex = 0;
  const tokens: string[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null = TOKEN_RE.exec(format);
  while (match) {
    pattern += escapeRegex(format.slice(lastIndex, match.index));
    pattern += tokenToCapture(match[0]);
    tokens.push(match[0]);
    lastIndex = TOKEN_RE.lastIndex;
    match = TOKEN_RE.exec(format);
  }
  pattern += `${escapeRegex(format.slice(lastIndex))}$`;
  const compiled: CompiledFormat = { re: new RegExp(pattern), tokens };
  compiledFormats.set(format, compiled);
  return compiled;
};

// 2-digit year pivot matching moment: 00-68 -> 2000s, 69-99 -> 1900s.
const expandTwoDigitYear = (yy: number): number => (yy <= 68 ? 2000 + yy : 1900 + yy);

const partsFromString = (input: string, format: string): DateParts | null => {
  const { re, tokens } = compileFormat(format);
  const match = re.exec(input.trim());
  if (!match) {
    return null;
  }
  const parts: DateParts = { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, ms: 0 };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const raw = match[i + 1];
    switch (token) {
      case 'YYYY':
        parts.year = Number(raw);
        break;
      case 'YY':
        parts.year = expandTwoDigitYear(Number(raw));
        break;
      case 'MMMM':
      case 'MMM': {
        const month = MONTH_INDEX[raw.toLowerCase()];
        if (!month) {
          return null;
        }
        parts.month = month;
        break;
      }
      case 'MM':
      case 'M':
        parts.month = Number(raw);
        break;
      case 'DD':
      case 'D':
        parts.day = Number(raw);
        break;
      case 'HH':
      case 'H':
        parts.hour = Number(raw);
        break;
      case 'mm':
        parts.minute = Number(raw);
        break;
      case 'ss':
        parts.second = Number(raw);
        break;
      default:
        if (token[0] === 'S') {
          // fractional seconds -> milliseconds (first 3 digits)
          parts.ms = Number(raw.slice(0, 3).padEnd(3, '0'));
        }
    }
  }
  return parts;
};

const zoneFormatterCache = new Map<TimeZone, Intl.DateTimeFormat>();

const zoneFormatter = (timeZone: TimeZone): Intl.DateTimeFormat => {
  let formatter = zoneFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    zoneFormatterCache.set(timeZone, formatter);
  }
  return formatter;
};

// Wall-clock parts of an instant as observed in `timeZone`.
const partsInZone = (date: Date, timeZone: TimeZone): DateParts => {
  const lookup: Record<string, string> = {};
  for (const part of zoneFormatter(timeZone).formatToParts(date)) {
    lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour) % 24, // Intl can emit '24' for midnight
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    ms: date.getMilliseconds(),
  };
};

// Offset (ms) of `timeZone` from UTC at the given instant: wallclock - utc.
const zoneOffset = (utcMs: number, timeZone: TimeZone): number => {
  const p = partsInZone(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - utcMs;
};

// Treat `parts` as wall-clock time in `timeZone` and return the matching instant.
const zonedPartsToInstant = (parts: DateParts, timeZone: TimeZone): Date => {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.ms);
  const offset = zoneOffset(guess, timeZone);
  let instant = guess - offset;
  // Re-check once: the offset can differ across a DST boundary.
  const offset2 = zoneOffset(instant, timeZone);
  if (offset2 !== offset) {
    instant = guess - offset2;
  }
  return new Date(instant);
};

export interface ParseOptions {
  /** Explicit format to parse with; auto-detected from `dateFormatRegexes` when omitted. */
  format?: string;
  /** Zone the wall-clock value is expressed in (naive strings). Defaults to UTC. */
  zone?: TimeZone;
}

/**
 * Parse a `DateLike` into a native `Date` instant, or `null` if invalid.
 * `Date` inputs pass through. Naive strings are interpreted in `opts.zone`
 * (default UTC). Strings carrying their own offset (full ISO) parse directly.
 */
export const parseDate = (input?: DateLike, opts: ParseOptions = {}): Date | null => {
  const { zone = UTC } = opts;
  if (input == null || input === '') {
    return input === '' ? null : new Date();
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (!isString(input)) {
    return null;
  }
  const format = opts.format || getTimeStringFormat(input);
  if (format) {
    const parts = partsFromString(input, format);
    if (!parts) {
      return null;
    }
    const instant =
      zone === UTC
        ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.ms))
        : zonedPartsToInstant(parts, zone);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }
  // No known format: fall back to the engine's ISO parser (handles offsets/ms).
  const fallback = new Date(input);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

/** Parse `original`, interpreting naive strings as UTC. */
export const getUTCDate = (original?: DateLike, currentFormat = ''): Date | null =>
  parseDate(original, { format: currentFormat, zone: UTC });

/** Parse `date`, interpreting naive strings as wall-clock time in `timeZone`. */
export const getZonedDate = (date: DateLike, timeZone: TimeZone, currentFormat = ''): Date | null =>
  parseDate(date, { format: currentFormat, zone: timeZone });

/** Parse `date`, interpreting naive strings as US Eastern (America/New_York) wall-clock time. */
export const getESTDate = (date?: DateLike, currentFormat = ''): Date | null =>
  parseDate(date ?? new Date(), { format: currentFormat, zone: EASTERN });

/** Parse `date`, interpreting naive strings in the runtime's local time zone. */
export const getLocalDate = (date?: DateLike, currentFormat = ''): Date | null =>
  parseDate(date ?? new Date(), {
    format: currentFormat,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

const formatToken = (token: string, parts: DateParts): string => {
  switch (token) {
    case 'YYYY':
      return pad(parts.year, 4);
    case 'YY':
      return pad(parts.year, 4).slice(-2);
    case 'MMMM':
      return MONTHS_LONG[parts.month - 1];
    case 'MMM':
      return MONTHS_SHORT[parts.month - 1];
    case 'MM':
      return pad(parts.month);
    case 'M':
      return String(parts.month);
    case 'DD':
      return pad(parts.day);
    case 'D':
      return String(parts.day);
    case 'HH':
      return pad(parts.hour);
    case 'H':
      return String(parts.hour);
    case 'mm':
      return pad(parts.minute);
    case 'ss':
      return pad(parts.second);
    default:
      return token[0] === 'S' ? pad(parts.ms, 3).padEnd(token.length, '0') : token;
  }
};

/**
 * Render an instant using a moment-style pattern, in the given `timeZone`
 * (default UTC). Supported tokens: YYYY YY MMMM MMM MM M DD D HH H mm ss S+.
 */
export const formatDate = (date: DateLike, pattern: string, timeZone: TimeZone = UTC): string => {
  const instant = parseDate(date, { zone: UTC });
  if (!instant) {
    return '';
  }
  const parts = partsInZone(instant, timeZone);
  return pattern.replace(TOKEN_RE, (token) => formatToken(token, parts));
};

const UNIT_MS: Partial<Record<TimeType, number>> = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

// Calendar-based diff for months/years (truncated toward zero, like moment.diff).
const calendarDiff = (older: Date, newer: Date, unit: 'months' | 'years'): number => {
  const sign = newer.getTime() >= older.getTime() ? 1 : -1;
  const from = sign > 0 ? older : newer;
  const to = sign > 0 ? newer : older;
  let count =
    unit === 'years'
      ? to.getUTCFullYear() - from.getUTCFullYear()
      : (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  const anchor = new Date(from.getTime());
  if (unit === 'years') {
    anchor.setUTCFullYear(from.getUTCFullYear() + count);
  } else {
    anchor.setUTCMonth(from.getUTCMonth() + count);
  }
  if (anchor.getTime() > to.getTime()) {
    count -= 1;
  }
  return sign * count;
};

const instantDiff = (timeType: TimeType, olderMs: number, newerMs: number): number => {
  const unitMs = UNIT_MS[timeType];
  if (unitMs) {
    return Math.trunc((newerMs - olderMs) / unitMs);
  }
  return calendarDiff(new Date(olderMs), new Date(newerMs), timeType as 'months' | 'years');
};

const toInstantMs = (value: DateLike): number => {
  const date = parseDate(value, { zone: UTC });
  return date ? date.getTime() : Number.NaN;
};

export const timePastDate = curry((timeType: TimeType, older: DateLike, newer: DateLike): number =>
  instantDiff(timeType, toInstantMs(older), toInstantMs(newer)),
);

export const minutesPastDate = timePastDate('minutes');
export const daysPastDate = timePastDate('days');

/** Absolute hours elapsed between `date` and `oldDate` (defaults to now). */
export const hoursPastDate = (date: Date, oldDate: Date = new Date()): number =>
  Math.abs(date.getTime() - oldDate.getTime()) / 3600000;

export const timePastDateExcludeWeekend = (
  timeType: TimeType,
  older: DateLike,
  newer: DateLike = new Date().toISOString(),
): number => {
  const newerMs = toInstantMs(newer);
  let olderMs = toInstantMs(older);

  const dayOfWeekNew: number = new Date(newerMs).getUTCDay();
  const dayOfWeekOld: number = new Date(olderMs).getUTCDay();

  // ex. if old is Wednesday and new is Monday, add back that weekend
  if (dayOfWeekOld > dayOfWeekNew) {
    olderMs += 48 * 60 * 60 * 1000;
  }

  const timePast: number = instantDiff(timeType, olderMs, newerMs);
  const timePastDays: number = timeType === 'days' ? timePast : instantDiff('days', olderMs, newerMs);
  const weekendDays: number = Math.floor(timePastDays / 7) * 2;

  if (weekendDays === 0) {
    return timePast;
  }

  if (timeType === 'days') {
    return timePast - weekendDays;
  }

  if (timeType === 'hours') {
    const weekendHours = weekendDays * 24;
    return timePast - weekendHours;
  }

  if (timeType === 'minutes') {
    const weekendMinutes = weekendDays * 24 * 60;
    return timePast - weekendMinutes;
  }

  return timePast;
};

/** Normalize a `DateLike` to an ISO 8601 string ('' when not a valid date). */
export const dateToISOString = (date?: DateLike): string => {
  if (isString(date)) {
    return date;
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  return '';
};
