import { unique } from '.';

describe('unique', () => {
  it('should return distinct strings', () => {
    expect(unique(['Harry', 'Luna', 'Ron', 'Harry'])).toEqual(['Harry', 'Luna', 'Ron']);
  });
});
