import { describe, expect, it } from 'bun:test';
import { concat } from '.';

describe('concat', () => {
  it('should concat arrays', () => {
    const parent = ['duck', 'duck', 'goose'];
    const child = [1, 2, 3];
    expect(concat(child)(parent)).toEqual([...parent, ...child]);
  });
  it('should concat arrays', () => {
    const parent: (string | number)[] = ['duck'];
    const child: (string | number)[] = [1, 2, 3];

    expect(concat(child)(parent)).toEqual(['duck', 1, 2, 3]);
  });
});
