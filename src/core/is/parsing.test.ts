import { describe, expect, it } from 'bun:test';
import { isStringBoolean, isStringNull, isStringNumber } from '.';

describe('isStringNumber', () => {
  it('identifies numeric strings correctly', () => {
    expect(isStringNumber('42')).toEqual(true);
    expect(isStringNumber('3.14')).toEqual(true);
    expect(isStringNumber('-7')).toEqual(true);
    expect(isStringNumber('0')).toEqual(true);
  });

  it('rejects non-numeric strings', () => {
    expect(isStringNumber('abc')).toEqual(false);
    expect(isStringNumber('')).toEqual(false);
    expect(isStringNumber(' ')).toEqual(false);
    expect(isStringNumber('NaN')).toEqual(false);
    expect(isStringNumber('Infinity')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringNumber(42)).toEqual(false);
    expect(isStringNumber(true)).toEqual(false);
    expect(isStringNumber(null)).toEqual(false);
    expect(isStringNumber(undefined)).toEqual(false);
    expect(isStringNumber({})).toEqual(false);
  });
});

describe('isStringBoolean', () => {
  it('identifies boolean strings correctly', () => {
    expect(isStringBoolean('true')).toEqual(true);
    expect(isStringBoolean('false')).toEqual(true);
    expect(isStringBoolean('TRUE')).toEqual(true);
    expect(isStringBoolean('FALSE')).toEqual(true);
    expect(isStringBoolean('TrUe')).toEqual(true);
  });

  it('rejects non-boolean strings', () => {
    expect(isStringBoolean('yes')).toEqual(false);
    expect(isStringBoolean('no')).toEqual(false);
    expect(isStringBoolean('1')).toEqual(false);
    expect(isStringBoolean('0')).toEqual(false);
    expect(isStringBoolean('')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringBoolean(true)).toEqual(false);
    expect(isStringBoolean(false)).toEqual(false);
    expect(isStringBoolean(1)).toEqual(false);
    expect(isStringBoolean(0)).toEqual(false);
    expect(isStringBoolean(null)).toEqual(false);
    expect(isStringBoolean(undefined)).toEqual(false);
    expect(isStringBoolean({})).toEqual(false);
  });
});

describe('isStringNull', () => {
  it('identifies "null" strings correctly', () => {
    expect(isStringNull('null')).toEqual(true);
    expect(isStringNull('NULL')).toEqual(true);
    expect(isStringNull('NuLl')).toEqual(true);
  });

  it('rejects non-"null" strings', () => {
    expect(isStringNull('nil')).toEqual(false);
    expect(isStringNull('undefined')).toEqual(false);
    expect(isStringNull('')).toEqual(false);
    expect(isStringNull(' ')).toEqual(false);
    expect(isStringNull('nulla')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringNull(null)).toEqual(false);
    expect(isStringNull(undefined)).toEqual(false);
    expect(isStringNull(0)).toEqual(false);
    expect(isStringNull(false)).toEqual(false);
    expect(isStringNull({})).toEqual(false);
  });
});
