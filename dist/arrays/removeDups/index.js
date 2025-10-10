"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDups = void 0;
const safeStringify_1 = require("../../helpers/safeStringify");
const removeDups = (arr) => {
    return arr.filter((item, index, self) => index === self.findIndex((t) => (0, safeStringify_1.safeStringify)(t) === (0, safeStringify_1.safeStringify)(item)));
};
exports.removeDups = removeDups;
