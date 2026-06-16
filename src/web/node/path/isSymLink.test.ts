import { fake, initializeGlobalMocks } from '@/ops/testing';

const mockManager = initializeGlobalMocks();

import { describe, expect, it } from 'bun:test';
import { isSymLink } from './isSymLink';

describe('isSymLink', () => {
  it('should return true for a directory (async)', async () => {
    fake('fs.promises.lstat', {
      isSymbolicLink: () => true,
    });

    await expect(isSymLink('/path/to/directory')).resolves.toBe(true);
  });

  it('should return false for non-symbolic links (async)', async () => {
    fake('fs.promises.lstat', () => ({
      isSymbolicLink: () => false,
    }));

    await expect(isSymLink('/path/to/file')).resolves.toBe(false);
  });

  it('should return false if an error occurs (async)', async () => {
    mockManager.registry.fs.promises.lstat.mockRejectedValue(new Error('Error'));

    await expect(isSymLink('/path/to/nonexistent')).resolves.toBe(false);
  });
});
