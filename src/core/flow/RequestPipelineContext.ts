import type { RequestLocals } from './RequestLocals';

/**
 * Minimal, Express-compatible HTTP shapes so cwip carries no `@types/express`
 * dependency. A real Express `Request`/`Response` is structurally assignable to
 * these (they have all this and more); intersect with your own types when you
 * want stricter typing. The `raw` fields use the global fetch `Response`.
 */
export type HttpRequest = { [key: string]: any };
export type HttpResponse = {
  writableEnded?: boolean;
  headersSent?: boolean;
  flush?: () => void;
  [key: string]: any;
};

export type ExternalResponse = {
  description: string;
  externalUrl: string;
  raw: Response;
  decodedChunks?: string;
  parsed?: Record<string, any>;
  error?: Error;
};

export type RequestPipelineContext<T> = {
  data: T;
  defaults?: {
    pipelineName?: string;
    responseStatus?: number;
  };
  errors?: any[];
  pipeline: {
    starting?: string;
    finished?: string;
  };
  req: HttpRequest & {
    locals: RequestLocals;
    files?: any[];
    status: number;
  };
  res: HttpResponse & { flush: () => void };
  response: {
    isUpstreamError?: boolean;
    json?: Record<string, any>;
    status?: number;
    upstreamResponse?: {
      raw: Response;
      json: Record<string, any>;
      text: string;
    };
  };
  stopProcessing: boolean;
  isFinalized?: boolean;
};
