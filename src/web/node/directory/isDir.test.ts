import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import { fake, fakeReject } from '@/ops/testing';

describe('isDirectory', () => {
  it('should return true for a directory (async)', async () => {
    fake('fs.promises.stat', { isDirectory: () => true });

    const { isDir } = require('.');
    const result = await isDir('/path/to/directory');
    expect(result).toBe(true);
    expect(fs.promises.stat).toHaveBeenCalledWith('/path/to/directory');
  });

  it('should return false for a non-directory (async)', async () => {
    fake('fs.promises.stat', { isDirectory: () => false });

    const { isDir } = require('.');
    const result = await isDir('/path/to/file');
    expect(result).toBe(false);
    expect(fs.promises.stat).toHaveBeenCalledWith('/path/to/file');
  });

  it('should return false if an error occurs (async)', async () => {
    fakeReject('fs.promises.stat', new Error('Error'));

    const { isDir } = require('.');
    const result = await isDir('/path/to/nonexistent');
    expect(result).toBe(false);
    expect(fs.promises.stat).toHaveBeenCalledWith('/path/to/nonexistent');
  });
});
