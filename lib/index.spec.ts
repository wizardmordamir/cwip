import * as lib from './index';

/*
should include these functions:
export * from './arrays';
export * from './combinedUtils/smartLog';
export * from './functional';
export * from './helpers';
export * from './js-types';
export * from './log';
export * from './logging';
export * from './math';
export * from './objects';
export * from './reg';
export * from './stats';
export * from './times';
export * from './ts-types';
*/
describe('lib', () => {
  it('should export all functions', () => {
    expect(lib).toEqual(
      expect.objectContaining({
        ...lib.arrays,
        ...lib.combinedUtils,
        ...lib.functional,
        ...lib.helpers,
        ...lib.jsTypes,
        ...lib.log,
        ...lib.logging,
        ...lib.math,
        ...lib.objects,
        ...lib.reg,
        ...lib.stats,
        ...lib.times,
        ...lib.tsTypes,
      }),
    );
  });
});
