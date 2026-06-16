import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** What `requestLogger` reports once a response finishes. */
export interface RequestLogInfo {
  method: string;
  /** The matched route pattern when available, else the request path. */
  path: string;
  status: number;
  durationMs: number;
}

export interface RequestLoggerOptions {
  /** Receives a summary per finished request. Defaults to `console.log` of one line. */
  log?: (info: RequestLogInfo) => void;
  /** Skip logging for paths matching any of these (e.g. health checks). */
  ignore?: Array<string | RegExp>;
}

/**
 * Express middleware that times each request and logs a summary when the response
 * finishes. The log target is injectable (wire it to your logger / metrics), so
 * this stays dependency-free. Generalized from an app's `perf_hooks` log middleware.
 *
 *   app.use(requestLogger({ log: (i) => logger.info(i), ignore: [/^\/health/] }));
 */
export const requestLogger = (options: RequestLoggerOptions = {}): RequestHandler => {
  const emit =
    options.log ??
    ((info: RequestLogInfo) => {
      console.log(`${info.method} ${info.path} ${info.status} ${info.durationMs.toFixed(1)}ms`);
    });
  const ignore = options.ignore ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url;
    if (ignore.some((p) => (typeof p === 'string' ? p === path : p.test(path)))) {
      return next();
    }
    const start = performance.now();
    res.on('finish', () => {
      emit({
        method: req.method,
        path: req.route?.path ?? path,
        status: res.statusCode,
        durationMs: performance.now() - start,
      });
    });
    next();
  };
};
