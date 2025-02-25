import { some } from '.';

describe('some', () => {
  it('should call some on array with passed in fn', () => {
    const someFn = (value) => value === 'goose';
    expect(some(someFn, ['duck', 'duck', 'goose'])).toEqual(true);
    expect(some(someFn, ['duck', 'duck', 'swan'])).toEqual(false);
  });
  it('should be curry-able', () => {
    const someFn = (value) => value === 'goose';
    expect(some(someFn)(['duck', 'duck', 'goose'])).toEqual(true);
    expect(some(someFn)(['duck', 'duck', 'swan'])).toEqual(false);
  });
});
