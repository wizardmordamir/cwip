import { describe, expect, it } from 'bun:test';
import { DEFAULT_IGNORE_CONSOLE, firstImportError, isIgnoredConsole, isViteImportError } from './classify';

describe('isViteImportError', () => {
  it('flags the real-world dev import-analysis failures this smoke exists for', () => {
    expect(isViteImportError('Failed to resolve import "@emoji-mart/data" from "src/x.tsx"')).toBe(true);
    expect(
      isViteImportError("The requested module '/x.tsx' does not provide an export named 'ChartThemeProvider'"),
    ).toBe(true);
    expect(
      isViteImportError('Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Dashboard.tsx'),
    ).toBe(true);
    expect(isViteImportError('[plugin:vite:import-analysis] something broke')).toBe(true);
    expect(isViteImportError('GET http://localhost:5173/x 500 (Internal Server Error)')).toBe(true);
    expect(isViteImportError('Could not resolve "./missing" from "src/a.ts"')).toBe(true);
    expect(isViteImportError('"foo" is not exported by "bar.js"')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isViteImportError('FAILED TO RESOLVE IMPORT "x"')).toBe(true);
  });

  it('does not flag ordinary runtime errors', () => {
    expect(isViteImportError('TypeError: Cannot read properties of undefined (reading "map")')).toBe(false);
    expect(isViteImportError('Warning: each child in a list should have a unique key')).toBe(false);
    expect(isViteImportError('')).toBe(false);
  });
});

describe('isIgnoredConsole', () => {
  it('ignores benign defaults case-insensitively', () => {
    expect(isIgnoredConsole('GET /favicon.ico 404', DEFAULT_IGNORE_CONSOLE)).toBe(true);
    expect(
      isIgnoredConsole('Failed to load resource: the server responded with a status of 404', DEFAULT_IGNORE_CONSOLE),
    ).toBe(true);
    expect(isIgnoredConsole('[vite] connecting...', DEFAULT_IGNORE_CONSOLE)).toBe(true);
  });

  it('does not ignore a real error', () => {
    expect(isIgnoredConsole('Uncaught ReferenceError: foo is not defined', DEFAULT_IGNORE_CONSOLE)).toBe(false);
  });

  it('treats an empty ignore-pattern as a no-op (never matches everything)', () => {
    expect(isIgnoredConsole('anything', [''])).toBe(false);
  });
});

describe('firstImportError', () => {
  it('returns the first import error in order, else undefined', () => {
    expect(firstImportError(['just a warning', 'Failed to resolve import "x"', 'another'])).toBe(
      'Failed to resolve import "x"',
    );
    expect(firstImportError(['warning', 'TypeError: x'])).toBeUndefined();
    expect(firstImportError([])).toBeUndefined();
  });
});
