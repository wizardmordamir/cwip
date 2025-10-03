"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRetriableHttpError = exports.isRetriableHttpStatus = void 0;
const dist_1 = require("../../../../dist");
const isRetriableHttpStatus = (statusCode) => statusCode === 408 || // Request Timeout
    statusCode === 429 || // Too Many Requests
    (statusCode >= 500 && statusCode <= 599); // 5xx Server Errors
exports.isRetriableHttpStatus = isRetriableHttpStatus;
const isRetriableHttpError = (error) => {
    if (error && typeof error === 'object') {
        if ('statusCode' in error) {
            return (0, exports.isRetriableHttpStatus)(Number(error.statusCode));
        }
        if ('status' in error) {
            return (0, exports.isRetriableHttpStatus)(Number(error.status));
        }
        if ((0, dist_1.isNetworkError)(error)) {
            return true;
        }
    }
    return false;
};
exports.isRetriableHttpError = isRetriableHttpError;
