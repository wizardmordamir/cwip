import { isNetworkError } from '../../../../dist';

export const isRetriableHttpStatus = (statusCode: number): boolean =>
  statusCode === 408 || // Request Timeout
  statusCode === 429 || // Too Many Requests
  (statusCode >= 500 && statusCode <= 599); // 5xx Server Errors

export const isRetriableHttpError = (error: any): boolean => {
  if (error && typeof error === 'object') {
    if ('statusCode' in error) {
      return isRetriableHttpStatus(Number(error.statusCode));
    }
    if ('status' in error) {
      return isRetriableHttpStatus(Number(error.status));
    }
    if (isNetworkError(error)) {
      return true;
    }
  }
  return false;
};
