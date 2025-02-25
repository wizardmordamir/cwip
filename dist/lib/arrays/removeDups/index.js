"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDups = void 0;
const removeDups = (arr) => {
    return arr.filter((item, index, self) => index === self.findIndex((t) => JSON.stringify(t) === JSON.stringify(item)));
};
exports.removeDups = removeDups;
