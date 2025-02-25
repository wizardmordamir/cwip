/*
  Many of these functions require moment timezone injected
*/
import { curry } from './functional';
import { isString } from './js-types';

let moment;

export const addMomentTimeZone = (momentTimezone, defaultTZ = 'Etc/UTC') => {
  moment = momentTimezone;
  moment.tz?.setDefault(defaultTZ);
};

export const dbTimeFormat = 'YYYY-MM-DD HH:mm:ss'; // use for db dates

// https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/
// HH means military time 00 - 23, hh means 00 - 12
// no caps for minutes or seconds
export const dateFormatRegexes = {
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

  'YYYY-MM-DD HH:mm:ss': /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // '2023-10-18 00:00:00'
  'MMM D, YYYY': /^[a-zA-Z]{3,5} \d{1,2}, \d{4}$/, // MAY 5, 2023
  'MMMM D, YYYY': /^[a-zA-Z]{6,} \d{1,2}, \d{4}$/, // December 5, 2023
  'YYYY-MM-DDTHH:mm:ssZ': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, // 2024-02-24T13:01:01Z
};

export const momentValidate = (date, finalFormat = '') => {
  let mom;
  if (!moment.isMoment(date)) {
    mom = moment(date, getTimeStringFormat(date));
  } else {
    mom = date;
  }
  if (mom.isValid()) {
    if (!finalFormat) {
      return mom;
    }
    return mom.format(finalFormat);
  }
  return '';
};

export const getTimeStringFormat = (dateString) => {
  if (!isString(dateString)) {
    return;
  }
  dateString = dateString.trim();
  return Object.keys(dateFormatRegexes).find((key) => dateFormatRegexes[key].test(dateString));
};

export const getUTCDate = (original?, currentFormat = '', format = '') => {
  let d;
  if (isString(original)) {
    d = moment.utc(original, currentFormat || getTimeStringFormat(original));
  } else {
    d = moment.utc(original);
  }
  return momentValidate(d, format);
};

export const getESTDate = (date, format = '') => {
  const d = moment.tz(date || new Date(), 'America/New_York');
  return momentValidate(d, format);
};

export const getLocalDate = (date, format = '') => {
  const d = moment(date);
  return momentValidate(d, format);
};

export const timePastDate = curry((timeType, older, newer = getUTCDate()) =>
  getUTCDate(newer).diff(getUTCDate(older), timeType),
);

export const minutesPastDateMoment = timePastDate('minutes');
export const hoursPastDateMoment = timePastDate('hours');
export const daysPastDateMoment = timePastDate('days');

export const hoursPastDate = (date, oldDate = new Date()) => {
  if (moment) {
    return hoursPastDateMoment();
  } else {
    return Math.abs(date.getTime() - oldDate.getTime()) / 3600000;
  }
};

export const timePastDateExcludeWeekend = (
  timeType: string,
  older: Date | string,
  newer: Date | string = new Date(),
) => {
  const dayOfWeekNew = getUTCDate(newer).day();
  const dayOfWeekOld = getUTCDate(older).day();

  // ex. if old is Wednesday and new is Monday, add back that weekend
  if (dayOfWeekOld > dayOfWeekNew) {
    older = getUTCDate(older).add(48, 'hours');
  }

  const timePast = timePastDate(timeType, older, newer);
  const timePastDays = timeType === 'days' ? timePast : timePastDate('days', older, newer);
  const weekendDays = Math.floor(timePastDays / 7) * 2;

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
