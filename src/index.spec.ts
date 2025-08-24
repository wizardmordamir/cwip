import * as lib from './index';

describe('lib', () => {
  it('should export all functions', () => {
    expect(lib.logger).toBeDefined();
  });
});
