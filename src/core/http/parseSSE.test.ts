import { describe, expect, it } from 'bun:test';
import { parseSSE, parseSSEJson } from '.';

describe('parseSSE', () => {
  it('parses complete events split on blank lines', () => {
    const { events, rest } = parseSSE('event: hello\ndata: world\n\ndata: bare\n\n');
    expect(rest).toBe('');
    expect(events).toEqual([
      { event: 'hello', data: 'world' },
      { event: 'message', data: 'bare' },
    ]);
  });

  it('defaults the event name to "message" and joins multi-line data', () => {
    const { events } = parseSSE('data: a\ndata: b\n\n');
    expect(events).toEqual([{ event: 'message', data: 'a\nb' }]);
  });

  it('carries an incomplete trailing record forward via rest', () => {
    const first = parseSSE('event: x\ndata: 1\n\nevent: y\ndata: 2');
    expect(first.events).toEqual([{ event: 'x', data: '1' }]);
    expect(first.rest).toBe('event: y\ndata: 2');
    // The boundary fell mid-line, so the next chunk continues `data: 2` → `data: 23`.
    const second = parseSSE('3\n\n', first.rest);
    expect(second.events).toEqual([{ event: 'y', data: '23' }]);
  });

  it('joins data across a record-boundary chunk split', () => {
    const first = parseSSE('data: a\n');
    expect(first.events).toEqual([]);
    const second = parseSSE('data: b\n\n', first.rest);
    expect(second.events).toEqual([{ event: 'message', data: 'a\nb' }]);
  });

  it('captures id and retry, ignores comments, normalizes CRLF', () => {
    const { events } = parseSSE(':comment\r\nid: 7\r\nretry: 500\r\ndata: hi\r\n\r\n');
    expect(events).toEqual([{ event: 'message', data: 'hi', id: '7', retry: 500 }]);
  });

  it('parseSSEJson parses data as JSON and skips invalid', () => {
    const { events } = parseSSEJson<{ n: number }>('data: {"n":1}\n\ndata: nope\n\ndata: {"n":2}\n\n');
    expect(events.map((e) => e.json)).toEqual([{ n: 1 }, { n: 2 }]);
  });
});
