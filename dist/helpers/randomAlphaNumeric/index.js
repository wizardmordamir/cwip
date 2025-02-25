"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomAlpahNumeric = void 0;
const randomAlpahNumeric = function (length) {
    let result = '';
    let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += options.charAt(Math.floor(Math.random() * options.length));
    }
    return result;
};
exports.randomAlpahNumeric = randomAlpahNumeric;
