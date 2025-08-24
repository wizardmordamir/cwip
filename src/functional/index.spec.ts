import * as fns from './index';

describe('Functional', () => {
  it('should export all functions', () => {
    expect(fns.loggit).toBeDefined();
    expect(fns.pipe).toBeDefined();
    expect(fns.ifIt).toBeDefined();
  });
});
