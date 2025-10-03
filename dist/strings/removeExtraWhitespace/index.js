"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeExtraWhitespace = void 0;
// Removes extra whitespace from a string, leaving only single spaces between words and trimming leading/trailing spaces.
// Example: "  Hello   World  " -> "Hello World"
const removeExtraWhitespace = (value) => {
    if (typeof value !== 'string')
        return value;
    return value.replace(/\s+/g, ' ').trim();
};
exports.removeExtraWhitespace = removeExtraWhitespace;
