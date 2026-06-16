import { afterEach, describe, expect, it } from 'bun:test';
import { fake, fakeReject, initializeGlobalMocks, resetAllMocks } from '@/ops/testing';

// 1. Initialize once at the top level
const { registry, mockManager } = initializeGlobalMocks();
mockManager.enable();

// 2. Import the actual functions
import { lstatSafe } from './lstatSafe';

describe('lstatSafe', () => {
  afterEach(() => {
    resetAllMocks();
  });

  it('should return stats for a valid path (async)', async () => {
    const mockStats = { isFile: () => true };

    // Using your helper to override the async implementation
    fake('fs.promises.lstat', mockStats);

    const result = await lstatSafe('/path/to/file');

    expect(result).toMatchObject(mockStats);
    expect(registry.fs.promises.lstat).toHaveBeenCalledWith('/path/to/file');
  });

  it('should return null for an invalid path (async)', async () => {
    // Using your helper to simulate a rejected promise
    fakeReject('fs.promises.lstat', new Error('Async Error'));

    const result = await lstatSafe('/path/to/nonexistent');

    expect(result).toBeNull();
    expect(registry.fs.promises.lstat).toHaveBeenCalledWith('/path/to/nonexistent');
  });
});
