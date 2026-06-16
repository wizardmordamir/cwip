import { parseSSE, type SSEEvent } from './parseSSE';

/**
 * Consume a `text/event-stream` `ReadableStream` (e.g. a fetch response body) as
 * an async iterable of parsed SSE events. A thin streaming wrapper over
 * `parseSSE`: bytes are UTF-8-decoded incrementally (multi-byte characters split
 * across chunks are handled), each event is yielded the moment its block
 * completes, and a final unterminated event is flushed at end of stream. The
 * reader's lock is always released, even if the consumer breaks early or throws.
 *
 *   const res = await fetch(url, { headers: { accept: 'text/event-stream' } });
 *   for await (const e of parseSSEStream(res.body!)) {
 *     handle(e.event, e.data);
 *   }
 */
export async function* parseSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent, void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let rest = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const parsed = parseSSE(decoder.decode(value, { stream: true }), rest);
      rest = parsed.rest;
      yield* parsed.events;
    }
    // Flush the decoder and any final event without a trailing blank line.
    const tail = parseSSE(`${decoder.decode()}\n\n`, rest);
    yield* tail.events;
  } finally {
    reader.releaseLock();
  }
}
