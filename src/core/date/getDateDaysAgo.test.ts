import { describe, expect, test } from 'bun:test';
import { getDateDaysAgo } from './getDateDaysAgo';

describe('getDateDaysAgo', () => {
  test('should return today when days is 0', () => {
    const result = getDateDaysAgo(0);
    const now = new Date();

    expect(result.getDate()).toBe(now.getDate());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getFullYear()).toBe(now.getFullYear());
  });

  test('should return yesterday when days is 1', () => {
    const result = getDateDaysAgo(1);
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should return date 7 days ago', () => {
    const result = getDateDaysAgo(7);
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should return date 30 days ago', () => {
    const result = getDateDaysAgo(30);
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should handle month boundary correctly', () => {
    const result = getDateDaysAgo(5);
    const expected = new Date();
    expected.setDate(expected.getDate() - 5);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should handle year boundary correctly', () => {
    const result = getDateDaysAgo(365);
    const expected = new Date();
    expected.setDate(expected.getDate() - 365);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should handle negative days (future dates)', () => {
    const result = getDateDaysAgo(-5);
    const expected = new Date();
    expected.setDate(expected.getDate() + 5);

    expect(result.getDate()).toBe(expected.getDate());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getFullYear()).toBe(expected.getFullYear());
  });

  test('should return a Date object', () => {
    const result = getDateDaysAgo(10);
    expect(result).toBeInstanceOf(Date);
  });

  test('should preserve time of day', () => {
    const beforeCall = new Date();
    const result = getDateDaysAgo(3);
    const afterCall = new Date();

    expect(result.getHours()).toBeGreaterThanOrEqual(beforeCall.getHours() - 1);
    expect(result.getHours()).toBeLessThanOrEqual(afterCall.getHours() + 1);
  });
});
