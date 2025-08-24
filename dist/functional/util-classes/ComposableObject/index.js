"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposableObject = void 0;
/* eslint-disable */
const util_functions_1 = require("../../util-functions");
class ComposableObject {
    static keys = (0, util_functions_1.curry)((fn, object) => {
        if (typeof object !== 'object') {
            return ['Error:Non Object Provided'];
        }
        return Object.keys(object).map(fn);
    });
    static values = (0, util_functions_1.curry)((fn, object) => {
        if (typeof object !== 'object') {
            return ['Error:Non Object Provided'];
        }
        return Object.values(object).map(fn);
    });
    static entries = (0, util_functions_1.curry)((fn, object) => {
        if (typeof object !== 'object') {
            return [['Error', 'Non Object Provided']];
        }
        return Object.entries(object).map(fn);
    });
    static mergeObjects = (0, util_functions_1.curry)((overridingObject, baseObject) => {
        if (typeof baseObject !== 'object' || typeof overridingObject !== 'object') {
            return { Error: 'Non Object Provided' };
        }
        return (0, util_functions_1.mergeObjects)(baseObject, overridingObject);
    });
    static fromEntries = (entries) => {
        try {
            return Object.fromEntries(entries);
        }
        catch (err) {
            return { Error: err.message };
        }
    };
}
exports.ComposableObject = ComposableObject;
