"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValue = void 0;
/* eslint-disable */
const isEmpty_1 = require("../isEmpty");
const curry_1 = require("../curry");
const fn = (path, object) => {
    if (!(0, isEmpty_1.isEmpty)(path)) {
        const [property] = path;
        return (object === null || object === void 0 ? void 0 : object.hasOwnProperty(property)) ? fn(path.slice(1), object[property]) : undefined;
    }
    return object;
};
exports.getValue = (0, curry_1.curry)(fn);
