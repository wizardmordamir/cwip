import { describe, expect, it, mock } from 'bun:test';
import fs from 'node:fs';

describe('removePath', () => {
  it('should call fs.promises.rm with correct options (async)', async () => {
    const rmMock = mock(() => Promise.resolve());
    const originalRm = fs.promises.rm;
    fs.promises.rm = rmMock as any;

    try {
      const { removePath } = require('./removePath');
      await removePath('/path/to/remove');
      expect(rmMock).toHaveBeenCalledWith('/path/to/remove', expect.objectContaining({ force: true, recursive: true }));
    } finally {
      fs.promises.rm = originalRm;
    }
  });
});
