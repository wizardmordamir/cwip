import { convertEncoding, fromBase64, isBase64, toBase64 } from '.';

describe('convertEncoding', () => {
  it('should convert utf-8 to base64', () => {
    const input = 'hello world';
    const result = convertEncoding(input, 'utf-8', 'base64');
    expect(result).toBe(Buffer.from(input, 'utf-8').toString('base64'));
  });

  it('should convert base64 to utf-8', () => {
    const input = Buffer.from('hello world', 'utf-8').toString('base64');
    const result = convertEncoding(input, 'base64', 'utf-8');
    expect(result).toBe('hello world');
  });

  it('should convert utf-8 to hex', () => {
    const input = 'test';
    const result = convertEncoding(input, 'utf-8', 'hex');
    expect(result).toBe(Buffer.from(input, 'utf-8').toString('hex'));
  });

  it('should convert hex to utf-8', () => {
    const input = Buffer.from('test', 'utf-8').toString('hex');
    const result = convertEncoding(input, 'hex', 'utf-8');
    expect(result).toBe('test');
  });
});

describe('toBase64', () => {
  it('should encode a string to base64', () => {
    expect(toBase64('foo')).toBe(Buffer.from('foo', 'utf-8').toString('base64'));
  });
});

describe('fromBase64', () => {
  it('should decode a base64 string to utf-8', () => {
    const base64 = Buffer.from('bar', 'utf-8').toString('base64');
    expect(fromBase64(base64)).toBe('bar');
  });
});

describe('isBase64', () => {
  it('should return true for valid base64 string', () => {
    const base64 = Buffer.from('baz', 'utf-8').toString('base64');
    expect(isBase64(base64)).toBe(true);
  });

  it('should return false for invalid base64 string', () => {
    expect(isBase64('not base64!')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isBase64('')).toBe(false);
  });
});
