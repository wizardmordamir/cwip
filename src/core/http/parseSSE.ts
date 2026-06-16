/**
 * A single parsed Server-Sent Event. Per the SSE spec a message has an optional
 * `event` name (default `'message'`), a `data` payload (multiple `data:` lines
 * are joined with `\n`), and optional `id`/`retry`. `data` is kept as the raw
 * string — callers decide whether to `JSON.parse` it (see `parseSSEJson`).
 */
export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

/** Result of parsing a streamed chunk: the completed events plus any trailing partial. */
export interface SSEParseResult {
  events: SSEEvent[];
  /** A trailing partial message to prepend to the next chunk (`''` if the chunk ended cleanly). */
  rest: string;
}

const FIELD = /^([^:]+):?[ ]?(.*)$/;

/** Parse one already-delimited SSE message block into an event (or null if it has no data). */
const parseBlock = (block: string): SSEEvent | null => {
  let event: string | undefined;
  const dataLines: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue; // blank line or comment
    }
    const match = line.match(FIELD);
    if (!match) {
      continue;
    }
    const [, field, value] = match;
    switch (field) {
      case 'event':
        event = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        id = value;
        break;
      case 'retry': {
        const n = Number.parseInt(value, 10);
        if (!Number.isNaN(n)) {
          retry = n;
        }
        break;
      }
    }
  }

  if (dataLines.length === 0) {
    return null; // a comment-only / id-only block carries no event
  }
  return {
    event: event ?? 'message',
    data: dataLines.join('\n'),
    ...(id !== undefined && { id }),
    ...(retry !== undefined && { retry }),
  };
};

/**
 * Incrementally parse a `text/event-stream`. Feed it each chunk as it arrives
 * (e.g. from a `ReadableStream` reader) along with the `rest` returned by the
 * previous call; it returns the events completed so far and any trailing partial
 * message to carry forward. Events are split on the SSE record separator (a blank
 * line); a final unterminated record is held back in `rest`.
 *
 *   let rest = '';
 *   for await (const chunk of stream) {
 *     const { events, rest: next } = parseSSE(chunk, rest);
 *     rest = next;
 *     for (const e of events) handle(e);
 *   }
 *
 * Generic over the event payload only at the call site — the parser itself stays
 * shape-agnostic, returning the raw `data` string for the caller to interpret.
 */
export const parseSSE = (chunk: string, rest = ''): SSEParseResult => {
  const combined = rest + chunk.replace(/\r\n?/g, '\n');
  const blocks = combined.split('\n\n');
  const trailing = blocks.pop() ?? '';

  const events: SSEEvent[] = [];
  for (const block of blocks) {
    if (!block.trim()) {
      continue;
    }
    const parsed = parseBlock(block);
    if (parsed) {
      events.push(parsed);
    }
  }
  return { events, rest: trailing };
};

/**
 * Like `parseSSE`, but `JSON.parse`s each event's `data` into `T`. Events whose
 * data isn't valid JSON are skipped (use `parseSSE` if you need the raw string or
 * to handle non-JSON payloads). Handy for the common case where every event is a
 * JSON object.
 */
export const parseSSEJson = <T = unknown>(
  chunk: string,
  rest = '',
): { events: Array<SSEEvent & { json: T }>; rest: string } => {
  const { events, rest: trailing } = parseSSE(chunk, rest);
  const out: Array<SSEEvent & { json: T }> = [];
  for (const e of events) {
    try {
      out.push({ ...e, json: JSON.parse(e.data) as T });
    } catch {
      // skip non-JSON data lines
    }
  }
  return { events: out, rest: trailing };
};
