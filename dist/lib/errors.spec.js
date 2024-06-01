"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./logging");
const _1 = require("./");
jest.mock('./logging', () => (Object.assign(Object.assign({}, jest.requireActual('./logging')), { shouldLogMessage: jest.fn() })));
describe('errors', () => {
    beforeEach(() => {
        jest.mocked(logging_1.shouldLogMessage).mockImplementation(() => true);
    });
    const makeError = () => ({
        code: 'test',
        message: 'test',
        stack: 'test',
        response: {},
    });
    describe('isNetworkErr', () => {
        it('should return true if error and error message are returned', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.isNetworkErr)({ message: 'ETIMEOUT' })).toBe(true);
        }));
        it('should return false if error and error message not returned', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.isNetworkErr)({ message: 'my test message' })).toBe(false);
        }));
    });
    describe('isAxiosError', () => {
        it('should return true if error response returned', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.isAxiosError)({ response: 'ETIMEOUT' })).toBe(true);
        }));
        it('should return false if error response not returned', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.isAxiosError)({})).toBe(false);
        }));
    });
    describe('showStackForError', () => {
        it('should return false with error and no error stack', () => __awaiter(void 0, void 0, void 0, function* () {
            const err = makeError();
            delete err.stack;
            expect((0, _1.showStackForError)(err)).toBe(false);
        }));
        it('should return false for error and error code in skipStackErrorCodes', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.showStackForError)(Object.assign(Object.assign({}, makeError()), { code: 'EREQUEST' }))).toBe(false);
        }));
        it('should return false for error and error messages in skipStackErrorMessages', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.showStackForError)(Object.assign(Object.assign({}, makeError()), { message: 'does not exist in remedy for provisioning' }))).toBe(false);
        }));
        it('should return false for error message', () => __awaiter(void 0, void 0, void 0, function* () {
            expect((0, _1.showStackForError)(Object.assign(Object.assign({}, makeError()), { message: 'does not exist in remedy word provisioning' }))).toBe(false);
        }));
        it('should return false for axios error', () => __awaiter(void 0, void 0, void 0, function* () {
            const _a = makeError(), { message } = _a, restOfError = __rest(_a, ["message"]);
            expect((0, _1.showStackForError)(Object.assign(Object.assign({}, restOfError), { response: 'ETIMEOUT' }))).toBe(false);
        }));
    });
    describe('removeModulesFromStack', () => {
        it('should remove node_modules from stack', () => {
            const err = new Error('test error');
            const removedErr = (0, _1.removeModulesFromStack)(err);
            expect(removedErr.stack.includes('/node_modules')).toBe(false);
        });
        it('should return undefined and not change error if no error stack', () => __awaiter(void 0, void 0, void 0, function* () {
            const errMsg = 'test err message';
            const err = new Error(errMsg);
            delete err.stack;
            (0, _1.removeModulesFromStack)(err);
            expect(err.stack).toBe(undefined);
            expect(err.message).toBe(errMsg);
        }));
    });
    describe('getMessageFromError Success', () => {
        it('should handle no params', () => {
            expect((0, _1.getMessageFromError)('')).toEqual('');
        });
        it('should handle failing parsing axios response', () => {
            const err = new Error('test error');
            err.response = {
                data: {
                    vals: '',
                },
            };
            err.response.data.vals = err.response; // make a circular reference
            const errMsg = (0, _1.getMessageFromError)(err);
            expect(typeof errMsg).toBe('string');
            expect(errMsg.includes('stringified')).toEqual(false);
        });
        it('should handle failing parsing axios response without data', () => {
            const err = new Error('test error');
            err.response = {};
            const errMsg = (0, _1.getMessageFromError)(err);
            expect(errMsg.includes('stringified')).toEqual(false);
        });
    });
});
