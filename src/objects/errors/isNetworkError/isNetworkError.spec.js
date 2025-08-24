import { isNetworkError, defaultNetworkErrorIndicators } from '.';

describe('isNetworkError', () => {
  it('returns true for network errors', () => {
    for (const indicator of defaultNetworkErrorIndicators) {
      let err = new Error(`Network Error ${indicator}`);
      expect(isNetworkError(err)).toBe(true);
      err = new Error(`${indicator} Network Error`);
      expect(isNetworkError(err)).toBe(true);
      err = new Error(`Network ${indicator} Error`);
      expect(isNetworkError(err)).toBe(true);
    }
  });

  it('returns false for non-network errors', () => {
    const err = new Error('Error');
    expect(isNetworkError(err)).toBe(false);
  });
});
