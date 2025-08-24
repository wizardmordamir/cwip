import { every } from '.';

describe('every', () => {
  it('should call every on array with passed in fn', () => {
    const everyFn = (value) => value === 'duck';
    expect(every(everyFn, ['duck', 'duck', 'goose'])).toEqual(false);
    expect(every(everyFn, ['duck', 'duck', 'duck'])).toEqual(true);
  });
  it('should be curry-able', () => {
    const everyFn = (value) => value === 'duck';
    expect(every(everyFn)(['duck', 'duck', 'goose'])).toEqual(false);
    expect(every(everyFn)(['duck', 'duck', 'duck'])).toEqual(true);
  });
});
