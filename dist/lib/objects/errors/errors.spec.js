"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logging_1 = require("../../logging");
const _1 = require(".");
globals_1.jest.mock('../../logging', () => ({
    ...globals_1.jest.requireActual('../../logging'),
    shouldLogMessage: globals_1.jest.fn(),
}));
describe('errors', () => {
    beforeEach(() => {
        globals_1.jest.mocked(logging_1.shouldLogMessage).mockImplementation(() => true);
    });
    const makeError = () => ({
        code: 'test',
        message: 'test',
        stack: 'test',
        response: {},
    });
    describe('isNetworkError', () => {
        it('should return true if error and error message are returned', async () => {
            expect((0, _1.isNetworkError)({ message: 'ETIMEOUT' })).toBe(true);
        });
        it('should return false if error and error message not returned', async () => {
            expect((0, _1.isNetworkError)({ message: 'my test message' })).toBe(false);
        });
    });
    describe('isAxiosError', () => {
        it('should return true if error response returned', async () => {
            expect((0, _1.isAxiosError)({ response: 'ETIMEOUT' })).toBe(true);
        });
        it('should return false if error response not returned', async () => {
            expect((0, _1.isAxiosError)({})).toBe(false);
        });
    });
    describe('showStackForError', () => {
        it('should return false with error and no error stack', async () => {
            const err = makeError();
            delete err.stack;
            expect((0, _1.showStackForError)(err)).toBe(false);
        });
        it('should return false for error and error code in skipStackErrorCodes', async () => {
            expect((0, _1.showStackForError)({ ...makeError(), code: 'EREQUEST' })).toBe(false);
        });
        it('should return false for axios error', async () => {
            const err = makeError();
            expect((0, _1.showStackForError)({ ...err, response: 'ETIMEOUT' })).toBe(false);
        });
    });
    describe('removeModulesFromStack', () => {
        it('should remove node_modules from stack', () => {
            const err = new Error('test error');
            const removedErr = (0, _1.removeModulesFromStack)(err);
            expect(removedErr.stack.includes('/node_modules')).toBe(false);
        });
        it('should return undefined and not change error if no error stack', async () => {
            const errMsg = 'test err message';
            const err = new Error(errMsg);
            delete err.stack;
            (0, _1.removeModulesFromStack)(err);
            expect(err.stack).toBe(undefined);
            expect(err.message).toBe(errMsg);
        });
    });
    describe('getMessageFromError Success', () => {
        it('should handle no params', () => {
            expect((0, _1.getMessageFromError)('')).toEqual('');
        });
        it('should handle failing parsing axios response', () => {
            const err = new Error('test error');
            err.response = { data: { vals: '' } };
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
