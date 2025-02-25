"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objHasKey = void 0;
const functional_1 = require("../../functional");
exports.objHasKey = (0, functional_1.curry)((obj, key) => Object.prototype.hasOwnProperty.call(obj, key));
