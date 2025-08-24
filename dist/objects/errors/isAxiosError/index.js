"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAxiosError = void 0;
const isAxiosError = (err) => !!err.response || err.isAxiosError === true;
exports.isAxiosError = isAxiosError;
