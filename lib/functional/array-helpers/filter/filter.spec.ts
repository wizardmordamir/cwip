import { filter } from '.';

describe('filter', () => {
  it('should call filter on array with passed in fn', () => {
    const array = ['duck', 'duck', 'goose'];
    const filterFn = (v) => v === 'duck';
    const filtered = filter(filterFn, array);
    expect(filtered).toEqual(['duck', 'duck']);
  });
  it('should be curry-able', () => {
    const array = ['duck', 'duck', 'goose'];
    const filterFn = (v) => v === 'duck';
    const filtered = filter(filterFn)(array);
    expect(filtered).toEqual(['duck', 'duck']);
  });
});
