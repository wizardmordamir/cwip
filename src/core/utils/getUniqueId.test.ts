import { describe, expect, it } from 'bun:test';
import { getUniqueId } from './getUniqueId';

describe('getUniqueId', () => {
  it('should generate a unique id', () => {
    const id: string = getUniqueId();
    expect(id).toBeDefined();
  });
});
