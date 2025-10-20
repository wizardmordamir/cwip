"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.momentOrDateToISOString = exports.timePastDateExcludeWeekend = exports.hoursPastDate = exports.daysPastDateMoment = exports.hoursPastDateMoment = exports.minutesPastDateMoment = exports.timePastDate = exports.getTimeStringFormat = exports.updateDateFormatRegexes = exports.dateFormatRegexes = exports.addMomentTimeZone = void 0;
exports.momentValidate = momentValidate;
exports.getUTCDate = getUTCDate;
exports.getESTDate = getESTDate;
exports.getLocalDate = getLocalDate;
const functional_1 = require("../../functional");
const js_types_1 = require("../../js-types");
let momentInjected = null;
const addMomentTimeZone = (momentTimezone, defaultTZ = 'Etc/UTC') => {
    momentInjected = momentTimezone;
    momentInjected.tz.setDefault(defaultTZ);
};
exports.addMomentTimeZone = addMomentTimeZone;
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
const updateDateFormatRegexes = (newFormats) => {
    Object.assign(exports.dateFormatRegexes, newFormats);
    return exports.dateFormatRegexes;
};
exports.updateDateFormatRegexes = updateDateFormatRegexes;
function momentValidate(date, finalFormat = '') {
    let mom;
    if (!momentInjected.isMoment(date)) {
        if ((0, js_types_1.isString)(date)) {
            mom = momentInjected(date, (0, exports.getTimeStringFormat)(date));
        }
        else {
            mom = momentInjected(date);
        }
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
}
const getTimeStringFormat = (dateString) => {
    if (!(0, js_types_1.isString)(dateString)) {
        return '';
    }
    dateString = dateString.trim();
    return Object.keys(exports.dateFormatRegexes).find((key) => exports.dateFormatRegexes[key].test(dateString));
};
exports.getTimeStringFormat = getTimeStringFormat;
function getUTCDate(original, currentFormat = '', format = '') {
    let d;
    if ((0, js_types_1.isString)(original)) {
        d = momentInjected.utc(original, currentFormat || (0, exports.getTimeStringFormat)(original));
    }
    else {
        d = momentInjected.utc(original);
    }
    return momentValidate(d, format);
}
function getESTDate(date, format = '') {
    const d = momentInjected.tz(date || new Date(), 'America/New_York');
    return momentValidate(d, format);
}
function getLocalDate(date, format = '') {
    const d = momentInjected(date);
    return momentValidate(d, format);
}
exports.timePastDate = (0, functional_1.curry)((timeType, older, newer) => getUTCDate(newer).diff(getUTCDate(older), timeType));
exports.minutesPastDateMoment = (0, exports.timePastDate)('minutes');
exports.hoursPastDateMoment = (0, exports.timePastDate)('hours');
exports.daysPastDateMoment = (0, exports.timePastDate)('days');
const hoursPastDate = (date, oldDate = new Date()) => {
    if (momentInjected) {
        return (0, exports.hoursPastDateMoment)(oldDate, date);
    }
    else {
        return Math.abs(date.getTime() - oldDate.getTime()) / 3600000;
    }
};
exports.hoursPastDate = hoursPastDate;
const timePastDateExcludeWeekend = (timeType, older, newer = new Date().toISOString()) => {
    const dayOfWeekNew = getUTCDate(newer).day();
    const dayOfWeekOld = getUTCDate(older).day();
    // ex. if old is Wednesday and new is Monday, add back that weekend
    if (dayOfWeekOld > dayOfWeekNew) {
        older = getUTCDate(older).add(48, 'hours');
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
const momentOrDateToISOString = (date) => {
    if ((0, js_types_1.isString)(date)) {
        return date;
    }
    if (!date) {
        return '';
    }
    if (momentInjected?.isMoment(date)) {
        return date.toISOString();
    }
    if (date instanceof Date) {
        return date.toISOString();
    }
    return '';
};
exports.momentOrDateToISOString = momentOrDateToISOString;
