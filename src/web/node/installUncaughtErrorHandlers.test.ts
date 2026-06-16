import { afterEach, describe, expect, it, mock } from 'bun:test';
import { AppError } from '../../core/error/AppError';
import { installUncaughtErrorHandlers } from './installUncaughtErrorHandlers';

type Listener = (...args: any[]) => void;

// Grab the listeners cwip just added (vs. whatever the runtime already had), so we
// can invoke them directly without emitting a real global event.
const added = (event: 'uncaughtException' | 'unhandledRejection', before: Listener[]) =>
  (process.listeners(event) as Listener[]).filter((l) => !before.includes(l));

let uninstall: (() => void) | null = null;

afterEach(() => {
  uninstall?.();
  uninstall = null;
});

describe('installUncaughtErrorHandlers', () => {
  it('logs an uncaughtException with structured fields and adds one listener', () => {
    const error = mock();
    const before = process.listeners('uncaughtException');
    uninstall = installUncaughtErrorHandlers({ logger: { error } });
    const ours = added('uncaughtException', before);
    expect(ours).toHaveLength(1);

    ours[0](new Error('boom'));
    expect(error).toHaveBeenCalledTimes(1);
    const [tag, fields] = error.mock.calls[0];
    expect(tag).toBe('[uncaughtException]');
    expect(fields).toMatchObject({ name: 'Error', message: 'boom' });
    expect(typeof fields.stack).toBe('string');
  });

  it('includes an AppError’s canonical summary (code/status/category/context)', () => {
    const error = mock();
    const before = process.listeners('uncaughtException');
    uninstall = installUncaughtErrorHandlers({ logger: { error } });

    added('uncaughtException', before)[0](
      new AppError('nope', { code: 'NOPE', status: 503, category: 'system', context: { id: 1 } }),
    );
    const fields = error.mock.calls[0][1];
    expect(fields).toMatchObject({
      name: 'AppError',
      message: 'nope',
      code: 'NOPE',
      status: 503,
      category: 'system',
      context: { id: 1 },
    });
    expect(typeof fields.stack).toBe('string');
  });

  it('logs an unhandledRejection with the reason fields and the promise', () => {
    const error = mock();
    const before = process.listeners('unhandledRejection');
    uninstall = installUncaughtErrorHandlers({ logger: { error } });

    const p = Promise.reject(new Error('rejected'));
    p.catch(() => {}); // keep the test runner clean
    added('unhandledRejection', before)[0](new Error('rejected'), p);
    const [tag, fields] = error.mock.calls[0];
    expect(tag).toBe('[unhandledRejection]');
    expect(fields).toMatchObject({ message: 'rejected' });
    expect(fields.promise).toBe(p);
  });

  it('exits with the configured code only when exitOnUncaughtException is set', () => {
    const error = mock();
    const exit = mock();
    const realExit = process.exit;
    (process as { exit: unknown }).exit = exit;
    try {
      const before = process.listeners('uncaughtException');
      uninstall = installUncaughtErrorHandlers({ logger: { error }, exitOnUncaughtException: true, exitCode: 7 });
      added('uncaughtException', before)[0](new Error('fatal'));
      expect(exit).toHaveBeenCalledWith(7);
    } finally {
      (process as { exit: unknown }).exit = realExit;
    }
  });

  it('is idempotent — a second install replaces cwip’s handlers (no duplicate logging)', () => {
    const error = mock();
    const before = process.listeners('uncaughtException');
    installUncaughtErrorHandlers({ logger: { error } });
    uninstall = installUncaughtErrorHandlers({ logger: { error } });
    // Only cwip's current single handler remains beyond the pre-existing ones.
    expect(added('uncaughtException', before)).toHaveLength(1);
  });

  it('uninstall removes the handlers it added', () => {
    const before = process.listeners('uncaughtException').length;
    const off = installUncaughtErrorHandlers({ logger: { error: mock() } });
    expect(process.listeners('uncaughtException').length).toBe(before + 1);
    off();
    expect(process.listeners('uncaughtException').length).toBe(before);
  });
});
