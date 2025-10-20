import moment from 'moment-timezone';
import {
  addMomentTimeZone,
  dateFormatRegexes,
  getESTDate,
  getLocalDate,
  getTimeStringFormat,
  getUTCDate,
  momentOrDateToISOString,
  timePastDate,
  timePastDateExcludeWeekend,
  updateDateFormatRegexes,
} from '.';

addMomentTimeZone(moment);

describe('times', () => {
  it('can update dateFormatRegexes dynamically', () => {
    const newFormat = {
      'MM/YYYY/DD HH:mm:ss': /^\d{2}\/\d{4}\/\d{2} \d{2}:\d{2}:\d{2}$/,
    };
    updateDateFormatRegexes(newFormat);
    expect(dateFormatRegexes['YYYY/MM/DD HH:mm:ss']).toBeDefined();
    const testDate = '2025/10/07 03:40:50';
    expect(getTimeStringFormat(testDate)).toBe('YYYY/MM/DD HH:mm:ss');
  });

  describe('momentOrDateToISOString', () => {
    it('should convert a moment object to ISO string', () => {
      const m: moment.Moment = moment.utc('2024-02-23T13:01:01Z');
      expect(momentOrDateToISOString(m)).toBe('2024-02-23T13:01:01.000Z');
    });

    it('should convert a Date object to ISO string', () => {
      const d = new Date('2024-02-23T13:01:01Z');
      expect(momentOrDateToISOString(d)).toBe('2024-02-23T13:01:01.000Z');
    });

    it('should handle null and undefined', () => {
      expect(momentOrDateToISOString(null as any)).toBe('');
      expect(momentOrDateToISOString(undefined as any)).toBe('');
    });

    it('should handle empty string', () => {
      expect(momentOrDateToISOString('')).toBe('');
    });

    it('should handle already ISO string', () => {
      const iso = '2024-02-23T13:01:01.000Z';
      expect(momentOrDateToISOString(iso)).toBe('2024-02-23T13:01:01.000Z');
    });

    it('should handle moment object with local timezone', () => {
      const m = moment('2024-02-23T13:01:01');
      expect(momentOrDateToISOString(m)).toMatch(/2024-02-23T13:01:01/);
    });
  });

  describe('getTimeStringFormat', () => {
    it('should get time formats', () => {
      const tests = [
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
        expect([i, getTimeStringFormat(tests[i][0]), ...tests[i]]).toEqual([
          i,
          tests[i][1],
          ...tests[i],
        ]);
        const mom: moment.Moment = moment(tests[i][0], tests[i][1]);
        expect([i, mom, moment.isMoment(mom), ...tests[i]]).toEqual([i, mom, true, ...tests[i]]);
        expect([i, mom, mom.toISOString(), ...tests[i]]).toEqual([
          i,
          mom,
          tests[i][2],
          ...tests[i],
        ]);
      }
    });

    it('detects SQL timestamp with fractional seconds', () => {
      const sqlTimestamp = '2025-10-07 03:40:50.8526802';
      expect(getTimeStringFormat(sqlTimestamp)).toBe('YYYY-MM-DD HH:mm:ss.SSSSSSS');
      // Should parse and format back to ISO or valid moment string
      const parsed: moment.Moment = getUTCDate(sqlTimestamp);
      expect(parsed).not.toBe('');
      expect(parsed.toISOString ? parsed.toISOString() : parsed).toContain('2025-10-07T03:40:50');
    });

    it('detects SQL timestamp without fractional seconds', () => {
      const sqlTimestamp = '2025-10-07 03:40:50';
      expect(getTimeStringFormat(sqlTimestamp)).toBe('YYYY-MM-DD HH:mm:ss');
      const parsed: moment.Moment = getUTCDate(sqlTimestamp);
      expect(parsed).not.toBe('');
      expect(parsed.toISOString ? parsed.toISOString() : parsed).toContain('2025-10-07T03:40:50');
    });
  });

  describe('getUTCDate', () => {
    it('should default to utc', () => {
      const dateOnlyString = '10/18/2023';
      expect(getUTCDate(dateOnlyString, 'MM/DD/YYYY').format()).toEqual('2023-10-18T00:00:00Z');
    });
    it('should assume utc when no timezone info in date string', () => {
      const stringDate = '2024-01-11 00:01:00.000';
      const converted: moment.Moment = getUTCDate(stringDate);
      expect(converted.utc().format()).toEqual('2024-01-11T00:01:00Z');
      expect(converted.toISOString()).toEqual('2024-01-11T00:01:00.000Z');
    });
  });

  describe('timePastDateExcludeWeekend', () => {
    it('should get time past date excluding weekends', () => {
      // works with hours
      expect(
        timePastDateExcludeWeekend('hours', '2023-01-02T23:14:08.627Z', '2023-01-06T23:14:08.627Z'),
      ).toBe(96); // Monday to Friday
      expect(
        timePastDateExcludeWeekend('hours', '2022-12-30T22:14:08.627Z', '2023-01-02T23:14:08.627Z'),
      ).toBe(25); // Friday to Monday
      expect(
        timePastDateExcludeWeekend('hours', '2022-12-29T22:14:08.627Z', '2023-01-03T23:14:08.627Z'),
      ).toBe(73); // Thursday to Tuesday
      // works with minutes
      expect(
        timePastDateExcludeWeekend(
          'minutes',
          '2023-01-02T23:14:08.627Z',
          '2023-01-06T23:14:08.627Z',
        ),
      ).toBe(5760); // Monday to Friday
      expect(
        timePastDateExcludeWeekend(
          'minutes',
          '2022-12-30T22:14:08.627Z',
          '2023-01-02T23:14:08.627Z',
        ),
      ).toBe(1500); // Friday to Monday
      expect(
        timePastDateExcludeWeekend(
          'minutes',
          '2022-12-29T22:14:08.627Z',
          '2023-01-03T23:14:08.627Z',
        ),
      ).toBe(4380); // Thursday to Tuesday
      // works with days
      expect(
        timePastDateExcludeWeekend('days', '2023-01-02T23:14:08.627Z', '2023-01-06T23:14:08.627Z'),
      ).toBe(4); // Monday to Friday
      expect(
        timePastDateExcludeWeekend('days', '2022-12-30T22:14:08.627Z', '2023-01-02T23:14:08.627Z'),
      ).toBe(1); // Friday to Monday
      expect(
        timePastDateExcludeWeekend('days', '2022-12-29T22:14:08.627Z', '2023-01-03T23:14:08.627Z'),
      ).toBe(3); // Thursday to Tuesday
    });
    it('should get time past between two dates with start day before end day', () => {
      const olderDate = '2024-02-19 00:00:00.000'; // Monday
      const newerDate = '2024-02-27 00:00:00.000'; // Tuesday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(6);
    });
    it('should get time past between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(4);
    });
    it('should get time past minutes between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'minutes',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(4 * 24 * 60);
    });
    it('should get time past hours between two dates with start day after end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-26 00:00:00.000'; // Monday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'hours',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(4 * 24);
    });
    it('should get time past between two dates with start day same as end day', () => {
      const olderDate = '2024-02-20 00:00:00.000'; // Tuesday
      const newerDate = '2024-02-27 00:00:00.000'; // Tuesday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(5);
    });
    it('should get time past between two dates with multiple weekends start day before end day', () => {
      const olderDate = '2024-02-01 00:00:00.000'; // Thursday
      const newerDate = '2024-02-23 00:00:00.000'; // Friday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(16);
    });
    it('should get time past between two dates with multiple weekends start day after end day', () => {
      const olderDate = '2024-02-02 00:00:00.000'; // Friday
      const newerDate = '2024-02-22 00:00:00.000'; // Thursday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(14);
    });
    it('should get time past between two dates with multiple weekends start day same as end day', () => {
      const olderDate = '2024-02-01 00:00:00.000'; // Thursday
      const newerDate = '2024-02-22 00:00:00.000'; // Thursday
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(15);
    });
    it('should get time past between two dates', () => {
      const olderDate = '2023-01-11 00:00:00.000';
      const newerDate = '2024-01-11 00:00:00.000';
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(261);
    });
    it('should get time past between two dates', () => {
      const olderDate = '2023-02-27T23:00:18.637Z';
      const newerDate = '2024-02-27T23:00:18.637Z';
      const timePastExcludingWeekends: number = timePastDateExcludeWeekend(
        'days',
        olderDate,
        newerDate,
      );
      expect(timePastExcludingWeekends).toEqual(261);
    });
  });

  describe('getESTDate', () => {
    it('should assume utc when no timezone info in date string', () => {
      const stringDate = '2024-01-11 00:01:00.000';
      const converted = getESTDate(stringDate);
      expect(typeof converted === 'string' ? false : converted.toISOString()).toEqual(
        '2024-01-11T05:01:00.000Z',
      );
      if (typeof converted !== 'string') {
        expect(converted.utc().format()).toEqual('2024-01-11T05:01:00Z');
      } else {
        fail('Expected a moment object, but got an empty string');
      }
      expect(converted.toISOString()).toEqual('2024-01-11T05:01:00.000Z');
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
  });

  describe('getLocalDate', () => {
    it('should get local time', () => {
      const dateString = new Date().toISOString();
      const result = getLocalDate(dateString);
      if (typeof result !== 'string') {
        expect(result.format()).toEqual(moment(dateString).format());
      } else {
        fail('Expected a Moment object, but got an empty string');
      }
    });
  });
});
