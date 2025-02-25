"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timePastDateExcludeWeekend = exports.hoursPastDate = exports.daysPastDateMoment = exports.hoursPastDateMoment = exports.minutesPastDateMoment = exports.timePastDate = exports.getLocalDate = exports.getESTDate = exports.getUTCDate = exports.getTimeStringFormat = exports.momentValidate = exports.dateFormatRegexes = exports.dbTimeFormat = exports.addMomentTimeZone = void 0;
/*
  Many of these functions require moment timezone injected
*/
const functional_1 = require("./functional");
const js_types_1 = require("./js-types");
let moment;
const addMomentTimeZone = (momentTimezone, defaultTZ = 'Etc/UTC') => {
    moment = momentTimezone;
    moment.tz?.setDefault(defaultTZ);
};
exports.addMomentTimeZone = addMomentTimeZone;
exports.dbTimeFormat = 'YYYY-MM-DD HH:mm:ss'; // use for db dates
// https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/
// HH means military time 00 - 23, hh means 00 - 12
// no caps for minutes or seconds
exports.dateFormatRegexes = {
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
const momentValidate = (date, finalFormat = '') => {
    let mom;
    if (!moment.isMoment(date)) {
        mom = moment(date, (0, exports.getTimeStringFormat)(date));
    }
    else {
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
exports.momentValidate = momentValidate;
const getTimeStringFormat = (dateString) => {
    if (!(0, js_types_1.isString)(dateString)) {
        return;
    }
    dateString = dateString.trim();
    return Object.keys(exports.dateFormatRegexes).find((key) => exports.dateFormatRegexes[key].test(dateString));
};
exports.getTimeStringFormat = getTimeStringFormat;
const getUTCDate = (original, currentFormat = '', format = '') => {
    let d;
    if ((0, js_types_1.isString)(original)) {
        d = moment.utc(original, currentFormat || (0, exports.getTimeStringFormat)(original));
    }
    else {
        d = moment.utc(original);
    }
    return (0, exports.momentValidate)(d, format);
};
exports.getUTCDate = getUTCDate;
const getESTDate = (date, format = '') => {
    const d = moment.tz(date || new Date(), 'America/New_York');
    return (0, exports.momentValidate)(d, format);
};
exports.getESTDate = getESTDate;
const getLocalDate = (date, format = '') => {
    const d = moment(date);
    return (0, exports.momentValidate)(d, format);
};
exports.getLocalDate = getLocalDate;
exports.timePastDate = (0, functional_1.curry)((timeType, older, newer = (0, exports.getUTCDate)()) => (0, exports.getUTCDate)(newer).diff((0, exports.getUTCDate)(older), timeType));
exports.minutesPastDateMoment = (0, exports.timePastDate)('minutes');
exports.hoursPastDateMoment = (0, exports.timePastDate)('hours');
exports.daysPastDateMoment = (0, exports.timePastDate)('days');
const hoursPastDate = (date, oldDate = new Date()) => {
    if (moment) {
        return (0, exports.hoursPastDateMoment)();
    }
    else {
        return Math.abs(date.getTime() - oldDate.getTime()) / 3600000;
    }
};
exports.hoursPastDate = hoursPastDate;
const timePastDateExcludeWeekend = (timeType, older, newer = new Date()) => {
    const dayOfWeekNew = (0, exports.getUTCDate)(newer).day();
    const dayOfWeekOld = (0, exports.getUTCDate)(older).day();
    // ex. if old is Wednesday and new is Monday, add back that weekend
    if (dayOfWeekOld > dayOfWeekNew) {
        older = (0, exports.getUTCDate)(older).add(48, 'hours');
    }
    const timePast = (0, exports.timePastDate)(timeType, older, newer);
    const timePastDays = timeType === 'days' ? timePast : (0, exports.timePastDate)('days', older, newer);
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
exports.timePastDateExcludeWeekend = timePastDateExcludeWeekend;
