import { flat } from '.';

describe('flat', () => {
  it('should flat arrays', () => {
    expect(flat()([['duck', 'duck'], 'goose'])).toEqual(['duck', 'duck', 'goose']);
    expect(flat(1)([['duck', 'duck'], ['goose']])).toEqual(['duck', 'duck', 'goose']);
    expect(flat(1)([[['duck'], 'duck'], ['goose']])).toEqual([['duck'], 'duck', 'goose']);
    expect(flat(2)([[['duck'], 'duck'], ['goose']])).toEqual(['duck', 'duck', 'goose']);
    expect(flat(3)([[['duck'], 'duck'], [[['goose']]]])).toEqual(['duck', 'duck', 'goose']);
    expect(flat(3)([[['duck'], 'duck'], [[[['goose']]]]])).toEqual(['duck', 'duck', ['goose']]);
  });
});
