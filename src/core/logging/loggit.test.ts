import { describe, expect, it, mock } from 'bun:test';
import { loggit } from '.';

describe('loggit', () => {
  it('call the first arg with the second arg and return the second', () => {
    const originalLog = console.log;
    // Tell the mock it can accept any arguments
    const spy = mock((..._args: any[]) => {});
    console.log = spy as any;

    try {
      const value = 'log value no args';
      const returned = loggit()(value);

      expect(spy.mock.calls.length).toBe(1);
      // Now TS knows index 0 might exist
      expect(spy.mock.calls[0][0]).toBe(value);
      expect(returned).toBe(value);
    } finally {
      console.log = originalLog;
    }
  });

  it('call with multiple args', () => {
    const originalLog = console.log;
    const spy = mock((..._args: any[]) => {});
    console.log = spy as any;

    try {
      const value = 'log value more than 1 arg';
      const note1 = 'note1';
      const note2 = 'note2';
      const returned = loggit(note1, note2)(value);

      expect(spy.mock.calls.length).toBe(1);
      // TS now allows comparing the arguments array
      expect(spy.mock.calls[0]).toEqual([note1, note2, value]);
      expect(returned).toBe(value);
    } finally {
      console.log = originalLog;
    }
  });
});
