"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromBase64 = exports.toBase64 = exports.convertEncoding = exports.isBase64 = void 0;
const isBase64 = (input) => {
    if (!input || typeof input !== 'string')
        return false;
    try {
        return btoa(atob(input)) === input;
    }
    catch (e) {
        return false;
    }
};
exports.isBase64 = isBase64;
const convertEncoding = (input, fromEncoding, toEncoding) => Buffer.from(input, fromEncoding).toString(toEncoding);
exports.convertEncoding = convertEncoding;
const toBase64 = (input) => (0, exports.convertEncoding)(input, 'utf-8', 'base64');
exports.toBase64 = toBase64;
const fromBase64 = (input) => (0, exports.convertEncoding)(input, 'base64', 'utf-8');
exports.fromBase64 = fromBase64;
