import { describe, expect, it } from 'bun:test';
import { makeIdFromData } from './makeIdFromData';

describe('makeIdFromData', () => {
  it('should generate a consistent id', () => {
    const id: string = makeIdFromData({ data: 'test' });
    expect(id).toBeDefined();
    for (let i = 0; i < 1000; i++) {
      const id2: string = makeIdFromData({ data: 'test' });
      expect([id, id2]).toStrictEqual([id2, id]);
    }
  });

  it('should generate a different id for different data', () => {
    const id: string = makeIdFromData({ data: 'test' });
    for (let i = 0; i < 1000; i++) {
      const id2: string = makeIdFromData({ data: 'test2' });
      expect(id).not.toBe(id2);
    }
  });
});
