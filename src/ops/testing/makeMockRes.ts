import { type Mock, mock } from 'bun:test';
import { ReadableStream } from 'node:stream/web';

// Self-contained, Express-compatible mock shape — no `@types/express` needed.
// The index signature preserves the loose `Partial<Response>` ergonomics (any
// extra Express member stays accessible) without importing express types.
export type MockResponse = {
  [key: string]: any;
  headers: Record<string, string | string[]>;
  status: Mock<(statusCode: number) => MockResponse>;
  set: Mock<(headerName: string, headerValue: string) => MockResponse>;
  header: Mock<(headerName: string, headerValue: string) => MockResponse>;
  write: Mock<(chunk: any, callback?: (error?: Error) => void) => boolean>;
  writeHead: Mock<(statusCode: number, headers?: Record<string, string | string[]>) => MockResponse>;
  end: Mock<(data?: any, encoding?: (() => void) | string, callback?: () => void) => MockResponse>;
  on: Mock<(event: string, listener: (...args: any[]) => void) => MockResponse>;
  flush: Mock<() => void>;
  body?: ReadableStream;
  bodyUsed?: boolean;
  chunks?: string[];
  writeEndCalled?: boolean;
};

export type StreamableResponse = MockResponse & {
  body: ReadableStream;
  bodyUsed: boolean;
};

/**
 * Creates a basic mock response object with all required methods and properties
 */
export const makeMockRes = (options: Partial<MockResponse> = {}): MockResponse => {
  const mockRes: any = {
    headers: {},
    destroyed: false,
    headersSent: false,
    writableEnded: false,
    status: mock(() => mockRes),
    json: mock(() => mockRes),
    sendStatus: mock(() => mockRes),
    send: mock(() => mockRes),
    write: mock((_chunk, callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }),
    writeHead: mock(() => mockRes),
    end: mock((_data, encoding, callback) => {
      if (typeof callback === 'function') {
        callback();
      } else if (typeof encoding === 'function') {
        encoding();
      }
      return mockRes;
    }),
    on: mock((_event, _listener) => {
      // Don't auto-fire events - let the test control when they fire
      return mockRes;
    }),
    once: mock((event, listener) => {
      // For 'drain' event - fire immediately to simulate drained buffer
      if (event === 'drain') {
        setImmediate(() => listener());
      }
      return mockRes;
    }),
    off: mock(() => mockRes),
    setHeader: mock(function (this: any, name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    }),
    getHeader: mock((name: string) => mockRes.headers[name]),
    ...options,
  };

  mockRes.set = mock((headerName: string, headerValue: string) => {
    mockRes.headers[headerName] = headerValue;
    return mockRes;
  });

  mockRes.header = mock((headerName: string, headerValue: string) => {
    mockRes.headers[headerName] = headerValue;
    return mockRes;
  });

  // Add StreamableResponse specific properties
  mockRes.body = new ReadableStream();
  mockRes.bodyUsed = false;
  mockRes.flush = mock();

  return mockRes as MockResponse;
};

/**
 * Creates a mock response with streaming capabilities
 */
export const makeStreamableMockRes = (options: Partial<StreamableResponse> = {}): StreamableResponse => {
  const mockRes = makeMockRes(options) as StreamableResponse;
  mockRes.body = options.body || new ReadableStream();
  mockRes.bodyUsed = options.bodyUsed ?? false;
  return mockRes;
};

/**
 * Creates a mock response with flush method for request pipeline context
 */
export const makePipelineMockRes = (
  options: Partial<MockResponse & { flush: Mock<() => void> }> = {},
): MockResponse & { flush: Mock<() => void> } => {
  const chunks: string[] = [];
  let writeEndCalled = false;

  const mockRes: any = {
    ...makeMockRes({
      ...options,
      write: mock().mockImplementation((chunk, callback) => {
        chunks.push(chunk.toString());
        if (typeof callback === 'function') {
          callback();
        }
        return true;
      }),
      end: mock().mockImplementation((data, encoding, callback) => {
        if (data) {
          chunks.push(data.toString());
        }
        writeEndCalled = true;
        if (typeof callback === 'function') {
          callback();
        } else if (typeof encoding === 'function') {
          encoding();
        }
        return mockRes;
      }),
    }),
    chunks,
    writeEndCalled,
    flush: options.flush || mock(),
    ...options,
  };

  return mockRes;
};
