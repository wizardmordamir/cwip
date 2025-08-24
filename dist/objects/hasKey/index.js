"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasKey = void 0;
const functional_1 = require("../../functional");
exports.hasKey = (0, functional_1.curry)((key, obj) => Object.prototype.hasOwnProperty.call(obj, key));
