import { describe, expect, it } from 'bun:test';
import { parseSSEStream, type SSEEvent } from '.';

const streamOf = (chunks: Uint8Array[]): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

const collect = async (chunks: Uint8Array[]) => {
  const events: SSEEvent[] = [];
  for await (const e of parseSSEStream(streamOf(chunks))) {
    events.push(e);
  }
  return events;
};

describe('parseSSEStream', () => {
  it('yields events across chunk boundaries', async () => {
    const enc = new TextEncoder();
    const events = await collect([enc.encode('data: he'), enc.encode('llo\n\nevent: done\ndata: bye\n\n')]);
    expect(events).toEqual([
      { event: 'message', data: 'hello' },
      { event: 'done', data: 'bye' },
    ]);
  });

  it('handles a multi-byte character split across chunks', async () => {
    const bytes = new TextEncoder().encode('data: é\n\n');
    const mid = 7; // splits the two-byte é
    const events = await collect([bytes.slice(0, mid), bytes.slice(mid)]);
    expect(events).toEqual([{ event: 'message', data: 'é' }]);
  });

  it('flushes a final unterminated event', async () => {
    const events = await collect([new TextEncoder().encode('data: tail')]);
    expect(events).toEqual([{ event: 'message', data: 'tail' }]);
  });
});
