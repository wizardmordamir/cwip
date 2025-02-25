import * as lib from './lib';

describe('lib', () => {
  it('should export all functions', () => {
    expect(lib.loggit).toBeDefined();
    expect(lib.pipe).toBeDefined();
    expect(lib.ifIt).toBeDefined();
  });
});
