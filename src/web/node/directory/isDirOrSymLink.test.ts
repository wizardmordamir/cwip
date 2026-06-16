import { fake, initializeGlobalMocks } from '@/ops/testing';

const mockManager = initializeGlobalMocks();

import { describe, expect, it } from 'bun:test';
import { isDirOrSymLink } from './isDirOrSymLink';

describe('isDirOrSymLink', () => {
  describe('Async', () => {
    it('should return true for a directory', async () => {
      fake('fs.promises.lstat', { isDirectory: () => true });
      await expect(isDirOrSymLink('/path')).resolves.toBe(true);
    });

    it('should return true for a symlink', async () => {
      fake('fs.promises.lstat', { isSymbolicLink: () => true });
      await expect(isDirOrSymLink('/path')).resolves.toBe(true);
    });

    it('should return false if lstat rejects', async () => {
      mockManager.registry.fs.promises.lstat.mockImplementation(() => Promise.reject(new Error()));

      await expect(isDirOrSymLink('/path')).resolves.toBe(false);
    });
  });
});
