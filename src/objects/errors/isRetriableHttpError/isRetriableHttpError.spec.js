import { isRetriableHttpError, isRetriableHttpStatus } from '.';

describe('isRetriableHttpError', () => {
  it('returns true for retriable HTTP errors', () => {
    const retriableStatuses = [408, 429, 500, 502, 503, 504];
    for (const status of retriableStatuses) {
      const err = new Error(`HTTP Error ${status}`);
      err.status = status;
      expect([status, isRetriableHttpError(err)]).toEqual([status, true]);
      expect([status, isRetriableHttpStatus(status)]).toEqual([status, true]);
    }
  });

  it('returns false for non-retriable HTTP errors', () => {
    const nonRetriableStatuses = [400, 401, 403, 404, 5000];
    for (const status of nonRetriableStatuses) {
      const err = new Error(`HTTP Error ${status}`);
      err.status = status;
      expect([status, isRetriableHttpError(err)]).toEqual([status, false]);
      expect([status, isRetriableHttpStatus(status)]).toEqual([status, false]);
    }
  });

  it('returns false for non-HTTP errors', () => {
    const err = new Error('Some other error');
    expect([err, isRetriableHttpError(err)]).toEqual([err, false]);
  });
});
