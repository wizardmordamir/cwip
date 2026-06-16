import { describe, expect, it } from 'bun:test';
import { readReport, resolveArtifactPath, SAFE_REPORT_ID } from './read';

// fs round-trips can't be observed under cwip's virtualized node:fs (see testSetup);
// the real read/write loop is covered in the cursedalchemy testkit. Here we lock the
// security-critical guards, which short-circuit before touching fs.
describe('report id guards', () => {
  it('accepts safe ids and rejects path-traversal / separators', () => {
    expect(SAFE_REPORT_ID.test('e2e-2026-01-01T00-00-00')).toBe(true);
    expect(SAFE_REPORT_ID.test('../etc/passwd')).toBe(false);
    expect(SAFE_REPORT_ID.test('a/b')).toBe(false);
    expect(SAFE_REPORT_ID.test('a b')).toBe(false);
  });

  it('readReport returns null for an unsafe id without hitting fs', () => {
    expect(readReport('/tmp/reports', '../../secret')).toBeNull();
  });

  it('resolveArtifactPath returns null for unsafe id or name', () => {
    expect(resolveArtifactPath('/tmp/reports', '../x', 'a.png')).toBeNull();
    expect(resolveArtifactPath('/tmp/reports', 'run-1', '../../secret')).toBeNull();
  });
});
