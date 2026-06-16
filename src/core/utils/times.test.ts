import { describe, expect, it } from 'bun:test';
import {
  dateFormatRegexes,
  dateToISOString,
  formatDate,
  getESTDate,
  getLocalDate,
  getTimeStringFormat,
  getUTCDate,
  parseDate,
  timePastDate,
  timePastDateExcludeWeekend,
  updateDateFormatRegexes,
} from '../date';

describe('times', () => {
  it('can update dateFormatRegexes dynamically', () => {
    const newFormat = {
      'MM/YYYY/DD HH:mm:ss': /^\d{2}\/\d{4}\/\d{2} \d{2}:\d{2}:\d{2}$/,
    };
    updateDateFormatRegexes(newFormat);
    expect(dateFormatRegexes['YYYY/MM/DD HH:mm:ss']).toBeDefined();
    expect(dateFormatRegexes['MM/YYYY/DD HH:mm:ss']).toBeDefined();
    const testDate = '2025/10/07 03:40:50';
    expect(getTimeStringFormat(testDate)).toBe('YYYY/MM/DD HH:mm:ss');
  });

  describe('dateToISOString', () => {
    it('should convert a Date object to ISO string', () => {
      const d = new Date('2024-02-23T13:01:01Z');
      expect(dateToISOString(d)).toBe('2024-02-23T13:01:01.000Z');
    });

    it('should handle null and undefined', () => {
      expect(dateToISOString(null as any)).toBe('');
      expect(dateToISOString(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(dateToISOString('')).toBe('');
    });

    it('should pass through an already ISO string', () => {
      const iso = '2024-02-23T13:01:01.000Z';
      expect(dateToISOString(iso)).toBe('2024-02-23T13:01:01.000Z');
    });
  });

  describe('getTimeStringFormat', () => {
    it('should detect formats and parse them to the expected UTC instant', () => {
      const tests: [string, string, string][] = [
        ['02/23/2024', 'MM/DD/YYYY', '2024-02-23T00:00:00.000Z'],
        ['2/3/2024', 'M/D/YYYY', '2024-02-03T00:00:00.000Z'],
        ['2/23/2024', 'M/DD/YYYY', '2024-02-23T00:00:00.000Z'],
        ['02/3/2024', 'MM/D/YYYY', '2024-02-03T00:00:00.000Z'],
        ['02/23/24', 'MM/DD/YY', '2024-02-23T00:00:00.000Z'],
        ['2/3/24', 'M/D/YY', '2024-02-03T00:00:00.000Z'],
        ['2/23/24', 'M/DD/YY', '2024-02-23T00:00:00.000Z'],
        ['02/3/24', 'MM/D/YY', '2024-02-03T00:00:00.000Z'],
        ['2024/02/23', 'YYYY/MM/DD', '2024-02-23T00:00:00.000Z'],
        ['2024/2/23', 'YYYY/M/DD', '2024-02-23T00:00:00.000Z'],
        ['2024/02/3', 'YYYY/MM/D', '2024-02-03T00:00:00.000Z'],
        ['02-23-2024', 'MM-DD-YYYY', '2024-02-23T00:00:00.000Z'],
        ['2-23-2024', 'M-DD-YYYY', '2024-02-23T00:00:00.000Z'],
        ['02-3-2024', 'MM-D-YYYY', '2024-02-03T00:00:00.000Z'],
        ['2-3-2024', 'M-D-YYYY', '2024-02-03T00:00:00.000Z'],
        ['02-03-24', 'MM-DD-YY', '2024-02-03T00:00:00.000Z'],
        ['2-3-24', 'M-D-YY', '2024-02-03T00:00:00.000Z'],
        ['2-23-24', 'M-DD-YY', '2024-02-23T00:00:00.000Z'],
        ['02-3-24', 'MM-D-YY', '2024-02-03T00:00:00.000Z'],
        ['2024-02-23', 'YYYY-MM-DD', '2024-02-23T00:00:00.000Z'],
        ['2024-2-03', 'YYYY-M-DD', '2024-02-03T00:00:00.000Z'],
        ['2024-02-3', 'YYYY-MM-D', '2024-02-03T00:00:00.000Z'],
        ['2023-10-18 00:00:00', 'YYYY-MM-DD HH:mm:ss', '2023-10-18T00:00:00.000Z'],
        ['2024-02-23T13:01:01Z', 'YYYY-MM-DDTHH:mm:ssZ', '2024-02-23T13:01:01.000Z'],
        ['MAY 5, 2023', 'MMM D, YYYY', '2023-05-05T00:00:00.000Z'],
        ['DECEMBER 5, 2023', 'MMMM D, YYYY', '2023-12-05T00:00:00.000Z'],
      ];

      for (let i = 0; i < tests.length; i++) {
        const [input, format, expectedISO] = tests[i];
        expect([i, getTimeStringFormat(input)]).toEqual([i, format]);
        const parsed = getUTCDate(input);
        expect([i, parsed?.toISOString()]).toEqual([i, expectedISO]);
      }
    });

    it('detects SQL timestamp with fractional seconds', () => {
      const sqlTimestamp = '2025-10-07 03:40:50.8526802';
      expect(getTimeStringFormat(sqlTimestamp)).toBe('YYYY-MM-DD HH:mm:ss.SSSSSSS');
      const parsed = getUTCDate(sqlTimestamp);
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toContain('2025-10-07T03:40:50');
    });

    it('detects SQL timestamp without fractional seconds', () => {
      const sqlTimestamp = '2025-10-07 03:40:50';
      expect(getTimeStringFormat(sqlTimestamp)).toBe('YYYY-MM-DD HH:mm:ss');
      const parsed = getUTCDate(sqlTimestamp);
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toContain('2025-10-07T03:40:50');
    });
  });

  describe('getUTCDate', () => {
    it('should parse a date-only string at UTC midnight', () => {
      const dateOnlyString = '10/18/2023';
      expect(getUTCDate(dateOnlyString, 'MM/DD/YYYY')?.toISOString()).toEqual('2023-10-18T00:00:00.000Z');
    });
    it('should assume utc when no timezone info in date string', () => {
      const stringDate = '2024-01-11 00:01:00.000';
      const converted = getUTCDate(stringDate);
      expect(converted?.toISOString()).toEqual('2024-01-11T00:01:00.000Z');
    });
  });

  describe('formatDate', () => {
    it('formats an instant in UTC', () => {
      const d = new Date('2024-02-23T13:01:01Z');
      expect(formatDate(d, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-02-23 13:01:01');
    });
    it('formats an instant in a target zone', () => {
      const d = new Date('2024-01-11T05:01:00Z');
      expect(formatDate(d, 'YYYY-MM-DD HH:mm:ss', 'America/New_York')).toBe('2024-01-11 00:01:00');
    });
    it('supports month-name tokens', () => {
      const d = new Date('2023-05-05T00:00:00Z');
      expect(formatDate(d, 'MMMM D, YYYY')).toBe('May 5, 2023');
      expect(formatDate(d, 'MMM D, YYYY')).toBe('May 5, 2023');
    });
  });

  describe('timePastDateExcludeWeekend', () => {
    it('should get time past date excluding weekends', () => {
      // works with hours
      expect(timePastDateExcludeWeekend('hours', '2023-01-02T23:14:08.627Z', '2023-01-06T23:14:08.627Z')).toBe(96); // Monday to Friday
      expect(timePastDateExcludeWeekend('hours', '2022-12-30T22:14:08.627Z', '2023-01-02T23:14:08.627Z')).toBe(25); // Friday to Monday
      expect(timePastDateExcludeWeekend('hours', '2022-12-29T22:14:08.627Z', '2023-01-03T23:14:08.627Z')).toBe(73); // Thursday to Tuesday
      // works with minutes
      expect(timePastDateExcludeWeekend('minutes', '2023-01-02T23:14:08.627Z', '2023-01-06T23:14:08.627Z')).toBe(5760); // Monday to Friday
      expect(timePastDateExcludeWeekend('minutes', '2022-12-30T22:14:08.627Z', '2023-01-02T23:14:08.627Z')).toBe(1500); // Friday to Monday
      expect(timePastDateExcludeWeekend('minutes', '2022-12-29T22:14:08.627Z', '2023-01-03T23:14:08.627Z')).toBe(4380); // Thursday to Tuesday
      // works with days
      expect(timePastDateExcludeWeekend('days', '2023-01-02T23:14:08.627Z', '2023-01-06T23:14:08.627Z')).toBe(4); // Monday to Friday
      expect(timePastDateExcludeWeekend('days', '2022-12-30T22:14:08.627Z', '2023-01-02T23:14:08.627Z')).toBe(1); // Friday to Monday
      expect(timePastDateExcludeWeekend('days', '2022-12-29T22:14:08.627Z', '2023-01-03T23:14:08.627Z')).toBe(3); // Thursday to Tuesday
    });
    it('should get time past between two dates with start day before end day', () => {
      const olderDate = '2024-02-19 00:00:00.000'; // Monday
      const newerDate = '2024-02-27 00:00:00.000'; // Tuesday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(6);
    });
    it('should get time past between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(4);
    });
    it('should get time past minutes between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      expect(timePastDateExcludeWeekend('minutes', olderDate, newerDate)).toEqual(4 * 24 * 60);
    });
    it('should get time past hours between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      expect(timePastDateExcludeWeekend('hours', olderDate, newerDate)).toEqual(4 * 24);
    });
    it('should get time past between two dates with start day same as end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-27 00:00:00.000'; // Tuesday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(5);
    });
    it('should get time past between two dates with multiple weekends start day before end day', () => {
      const olderDate = '2024-02-01 00:00:00.000'; // Thursday
      const newerDate = '2024-02-23 00:00:00.000'; // Friday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(16);
    });
    it('should get time past between two dates with multiple weekends start day after end day', () => {
      const olderDate = '2024-02-02 00:00:00.000'; // Friday
      const newerDate = '2024-02-22 00:00:00.000'; // Thursday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(14);
    });
    it('should get time past between two dates with multiple weekends start day same as end day', () => {
      const olderDate = '2024-02-01 00:00:00.000'; // Thursday
      const newerDate = '2024-02-22 00:00:00.000'; // Thursday
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(15);
    });
    it('should get time past between two dates (naive strings)', () => {
      const olderDate = '2023-01-11 00:00:00.000';
      const newerDate = '2024-01-11 00:00:00.000';
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(261);
    });
    it('should get time past between two dates (ISO strings)', () => {
      const olderDate = '2023-02-27T23:00:18.637Z';
      const newerDate = '2024-02-27T23:00:18.637Z';
      expect(timePastDateExcludeWeekend('days', olderDate, newerDate)).toEqual(261);
    });
  });

  describe('getESTDate', () => {
    it('should interpret a naive string as Eastern wall-clock time', () => {
      const stringDate = '2024-01-11 00:01:00.000';
      const converted = getESTDate(stringDate);
      expect(converted).not.toBeNull();
      // 00:01 EST (UTC-5 in January) === 05:01 UTC
      expect(converted?.toISOString()).toEqual('2024-01-11T05:01:00.000Z');
    });
    it('round-trips back to Eastern wall-clock via formatDate', () => {
      const converted = getESTDate('2024-01-11 00:01:00.000');
      expect(formatDate(converted as Date, 'YYYY-MM-DD HH:mm:ss', 'America/New_York')).toBe('2024-01-11 00:01:00');
    });
  });

  describe('timePastDate', () => {
    // timeType, date, nowDate
    it('should get time past date for one minute', () => {
      const olderDate = '2024-01-11 00:00:00.000';
      const newerDate = '2024-01-11 00:01:00.000';
      expect(timePastDate('minutes', olderDate, newerDate)).toEqual(1);
    });

    it('should get time past date for minutes', () => {
      const olderDate = '2024-01-11 00:00:00.000';
      const newerDate = '2024-01-11 01:30:30.000';
      expect(timePastDate('minutes', olderDate, newerDate)).toEqual(90);
    });

    it('should get time past date for days', () => {
      const dateString = new Date().toISOString();
      expect(timePastDate('days', dateString, new Date())).toEqual(0);
    });

    it('should get time past date for full year for days', () => {
      const olderDate = '2023-01-11 00:00:00.000';
      const newerDate = '2024-01-11 00:00:00.000';
      expect(timePastDate('days', olderDate, newerDate)).toEqual(365);
    });

    it('should support calendar months and years', () => {
      expect(timePastDate('months', '2023-01-11 00:00:00.000', '2024-01-11 00:00:00.000')).toEqual(12);
      expect(timePastDate('years', '2023-01-11 00:00:00.000', '2024-01-11 00:00:00.000')).toEqual(1);
      expect(timePastDate('months', '2024-01-31 00:00:00.000', '2024-03-30 00:00:00.000')).toEqual(1);
    });
  });

  describe('getLocalDate', () => {
    it('parses an ISO instant identically regardless of local zone', () => {
      const dateString = '2024-06-02T12:34:56.000Z';
      const result = getLocalDate(dateString);
      expect(result?.getTime()).toEqual(new Date(dateString).getTime());
    });
  });

  describe('parseDate', () => {
    it('passes Date inputs through', () => {
      const d = new Date('2024-02-23T13:01:01Z');
      expect(parseDate(d)).toBe(d);
    });
    it('returns null for empty string and invalid input', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('not a date')).toBeNull();
    });
  });
});
