import { describe, expect, it } from 'bun:test';
import {
  dateToISOString,
  daysPastDate,
  formatDate,
  getTimeStringFormat,
  minutesPastDate,
  parseDate,
  timePastDate,
} from './dateTime';

describe('getTimeStringFormat', () => {
  it('detects common date string formats', () => {
    expect(getTimeStringFormat('10/18/2023')).toBe('MM/DD/YYYY');
    expect(getTimeStringFormat('2023-10-18')).toBe('YYYY-MM-DD');
    expect(getTimeStringFormat('2023-10-18 00:00:00')).toBe('YYYY-MM-DD HH:mm:ss');
    expect(getTimeStringFormat('2024-02-24T13:01:01Z')).toBe('YYYY-MM-DDTHH:mm:ssZ');
    expect(getTimeStringFormat('December 5, 2023')).toBe('MMMM D, YYYY');
  });

  it('returns empty for an unrecognized or non-string input', () => {
    expect(getTimeStringFormat('not a date')).toBe('');
    expect(getTimeStringFormat(123 as unknown as string)).toBe('');
  });
});

describe('parseDate', () => {
  it('parses ISO strings and Date inputs to the same instant', () => {
    const iso = '2024-02-24T13:01:01Z';
    expect(parseDate(iso)?.toISOString()).toBe('2024-02-24T13:01:01.000Z');
    expect(parseDate(new Date(iso))?.toISOString()).toBe('2024-02-24T13:01:01.000Z');
  });

  it('returns null for empty/garbage input', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('banana')).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats an instant in UTC by tokens', () => {
    const d = '2023-10-18T09:05:03Z';
    expect(formatDate(d, 'YYYY-MM-DD')).toBe('2023-10-18');
    expect(formatDate(d, 'YYYY-MM-DD HH:mm:ss')).toBe('2023-10-18 09:05:03');
  });

  it('returns empty for an unparseable date', () => {
    expect(formatDate('nope', 'YYYY-MM-DD')).toBe('');
  });
});

describe('timePastDate and friends', () => {
  const older = '2024-01-01T00:00:00Z';
  const newer = '2024-01-08T12:00:00Z'; // +7d 12h

  it('computes elapsed units (truncated toward zero)', () => {
    expect(timePastDate('days', older, newer)).toBe(7);
    expect(timePastDate('hours', older, newer)).toBe(180);
    expect(daysPastDate(older, newer)).toBe(7);
    expect(minutesPastDate(older, '2024-01-01T00:30:00Z')).toBe(30);
  });

  it('is negative when newer precedes older', () => {
    expect(daysPastDate(newer, older)).toBe(-7);
  });

  it('does calendar diffs for months/years', () => {
    expect(timePastDate('months', '2024-01-15T00:00:00Z', '2024-04-10T00:00:00Z')).toBe(2); // not yet 3 full months
    expect(timePastDate('years', '2020-06-01T00:00:00Z', '2024-05-01T00:00:00Z')).toBe(3);
  });
});

describe('dateToISOString', () => {
  it('passes a string through unchanged and normalizes a Date to ISO', () => {
    expect(dateToISOString('2024-02-24T13:01:01Z')).toBe('2024-02-24T13:01:01Z');
    expect(dateToISOString(new Date('2024-02-24T13:01:01Z'))).toBe('2024-02-24T13:01:01.000Z');
    expect(dateToISOString(undefined)).toBe('');
  });
});
