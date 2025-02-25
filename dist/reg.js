"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromMiddle = exports.removeFromEnds = exports.removeFromEnd = exports.removeFromStart = exports.alphaNumRegex = exports.makeRegexToMatchCharsInStr = exports.makeRegexToMatchCharsNotInStr = exports.escapeForRegex = exports.asciiExtendedRegex = exports.isPrintableASCII = exports.isASCII = void 0;
/* eslint no-control-regex: 0 */
const isASCII = (str, extended) => (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);
exports.isASCII = isASCII;
const isPrintableASCII = (str) => /^[\x20-\xFF]*$/.test(str);
exports.isPrintableASCII = isPrintableASCII;
exports.asciiExtendedRegex = /([^\x20-\xFF]+)/gi;
// in a string - must be first or escaped
// escape these [] for the regex to work
const escapeForRegex = (str) => {
    str.replaceAll('[', '\\[');
    str.replaceAll(']', '\\]');
    str.replaceAll('-', '\\-');
    return str;
};
exports.escapeForRegex = escapeForRegex;
const makeRegexToMatchCharsNotInStr = (str) => new RegExp('([^' + (0, exports.escapeForRegex)(str) + '])', 'g');
exports.makeRegexToMatchCharsNotInStr = makeRegexToMatchCharsNotInStr;
const makeRegexToMatchCharsInStr = (str) => new RegExp('([' + (0, exports.escapeForRegex)(str) + '])', 'g');
exports.makeRegexToMatchCharsInStr = makeRegexToMatchCharsInStr;
// /([^a-z0-9'\-.() ]+)/gi, example if some symbols were allowed
exports.alphaNumRegex = /([^a-z0-9']+)/gi;
const removeFromStart = (str, char) => {
    let strArr = str.split('');
    let begin = 0;
    for (let i = 0; i < strArr.length; i++) {
        if (strArr[i] !== char) {
            break;
        }
        begin = i;
    }
    strArr = strArr.slice(begin);
    return strArr.join('');
};
exports.removeFromStart = removeFromStart;
const removeFromEnd = (str, char) => {
    let strArr = str.split('');
    while (strArr[-1] === char) {
        strArr = strArr.slice(0, strArr.length - 1);
    }
    return strArr.join('');
};
exports.removeFromEnd = removeFromEnd;
const removeFromEnds = (str, char) => {
    let strArr = str.split('');
    let begin = 0;
    for (let i = 0; i < strArr.length; i++) {
        if (strArr[i] !== char) {
            break;
        }
        begin = i;
    }
    strArr = strArr.slice(begin);
    while (strArr[-1] === char) {
        strArr = strArr.slice(0, strArr.length - 1);
    }
    return strArr.join('');
};
exports.removeFromEnds = removeFromEnds;
const removeFromMiddle = (str, char) => {
    let strArr = str.split('');
    for (let i = strArr.length - 2; i > 0; i--) {
        if (strArr[i] === char && strArr[i + 1] === char) {
            strArr.splice(i + 1, 1);
        }
    }
    return strArr.join('');
};
exports.removeFromMiddle = removeFromMiddle;
