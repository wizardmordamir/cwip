"use strict";
// Example usage:
// const input = { a: '{"b":"{\\"c\\":3}"}', d: '[1,2,"{\\"e\\":4}"]' };
// const output = deepJsonParse(input);
// console.log(output); // { a: { b: { c: 3 } }, d: [1, 2, { e: 4 }] }
// handles nested JSON strings in objects and arrays
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepJsonParse = exports.tryJsonParse = exports.isStringNull = exports.isStringBoolean = exports.isStringNumber = void 0;
exports.isPlainObject = isPlainObject;
const isStringNumber = (value) => typeof value === 'string' &&
    value.trim() !== '' &&
    !['Infinity', '-Infinity', 'NaN'].includes(value.trim()) &&
    !isNaN(Number(value));
exports.isStringNumber = isStringNumber;
const isStringBoolean = (value) => typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false');
exports.isStringBoolean = isStringBoolean;
const isStringNull = (value) => typeof value === 'string' && value.toLowerCase() === 'null';
exports.isStringNull = isStringNull;
// Try to JSON.parse a value, return original value if parsing fails
const tryJsonParse = (value, skipParsingFn) => {
    if (typeof value !== 'string')
        return value;
    if (skipParsingFn && skipParsingFn(value)) {
        return value;
    }
    try {
        return JSON.parse(value, (_, v) => (0, exports.tryJsonParse)(v, skipParsingFn));
    }
    catch {
        return value;
    }
};
exports.tryJsonParse = tryJsonParse;
// handle strings, arrays, objects, null, undefined, numbers, booleans
// but not functions, dates, regexes, maps, sets, etc.
function isPlainObject(value) {
    return (value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === '[object Object]');
}
// Recursively parse JSON strings in an object or array or any value
const deepJsonParse = (obj, seen = new WeakSet(), maxDepth = 10, currentDepth = 0, skipParsingFn) => {
    if (currentDepth > maxDepth)
        return obj;
    if (typeof obj === 'object' && obj !== null) {
        if (seen.has(obj))
            return obj;
        seen.add(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => (0, exports.deepJsonParse)((0, exports.tryJsonParse)(item, skipParsingFn), seen, maxDepth, currentDepth + 1, skipParsingFn));
    }
    else if (isPlainObject(obj)) {
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = (0, exports.deepJsonParse)((0, exports.tryJsonParse)(obj[key], skipParsingFn), seen, maxDepth, currentDepth + 1, skipParsingFn);
        }
        return result;
    }
    else {
        return (0, exports.tryJsonParse)(obj, skipParsingFn);
    }
};
exports.deepJsonParse = deepJsonParse;
