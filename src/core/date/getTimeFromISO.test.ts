import { afterEach, describe, expect, it } from 'bun:test';
import { getTimeFromISO } from './getTimeFromISO';

describe('getTimeFromISO', () => {
  const originalDate = global.Date;

  afterEach(() => {
    global.Date = originalDate;
  });

  it('should return the time from an ISO string argument', () => {
    expect(getTimeFromISO('2022-01-01T10:04:00.123Z')).toBe('10:04:00.123');
  });

  it('should return the current time from when no argument is provided', () => {
    const expectedTime = '11:01:02.123';
    const mockISOString = `2022-01-01T${expectedTime}Z`;
    const mockDate = new Date(mockISOString);

    global.Date = class extends originalDate {
      constructor() {
        super();
        // biome-ignore lint/correctness/noConstructorReturn: Test mock requires returning Date instance
        return mockDate;
      }
    } as any;

    expect(getTimeFromISO()).toBe(expectedTime);
  });
});
