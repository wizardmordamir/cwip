import type { Express, RequestHandler } from 'express';
import { requirePeer } from '../../core/_internal/requirePeer';
import { type CorrelationIdOptions, correlationId } from './correlationId';
import { type CorsWhitelistOptions, corsWhitelist } from './corsWhitelist';
import { type ErrorHandlerOptions, errorHandler } from './errorHandler';
import { addHealthRoutes, type HealthRoutesOptions } from './healthRoutes';
import { notFoundHandler } from './notFoundHandler';
import { type RequestLoggerOptions, requestLogger } from './requestLogger';
import { type SecurityHeadersOptions, securityHeaders } from './securityHeaders';
import { addStaticSpa, type StaticSpaOptions } from './staticSpa';

export interface CreateAppOptions {
  /** Per-request correlation id (default on). `false` to skip. Mounted first so logging/errors share the id. */
  correlationId?: CorrelationIdOptions | false;
  /** Security headers (default on). `false` to skip (e.g. behind a gateway that sets them). */
  securityHeaders?: SecurityHeadersOptions | false;
  /** CORS whitelist; omit to skip CORS entirely. */
  cors?: CorsWhitelistOptions;
  /** gzip response compression; pass `true`/options to enable (needs the optional `compression` peer). */
  compression?: object | boolean;
  /** JSON body parsing (default on). Pass body-parser options or `false` to skip. */
  json?: object | boolean;
  /** Per-request logging; omit to skip. */
  requestLogger?: RequestLoggerOptions;
  /** Mount liveness/readiness routes (default on). `false` to skip. */
  health?: HealthRoutesOptions | false;
  /** Run before user routes are mounted (extra middleware, etc.). */
  beforeRoutes?: (app: Express) => void;
  /** Mount your application routes here. */
  routes?: (app: Express) => void;
  /** Run after user routes, before static/404/error handlers. */
  afterRoutes?: (app: Express) => void;
  /** Serve a static dir + SPA `index.html` fallback (e.g. a built UI). Mounted after routes. */
  static?: StaticSpaOptions;
  /** Add the JSON 404 handler (default on). */
  notFound?: boolean;
  /** Terminal error handler (default on). `false` to supply your own. */
  errorHandler?: ErrorHandlerOptions | false;
}

type CompressionModule = { default?: (opts?: object) => unknown } & ((opts?: object) => unknown);

type ExpressModule = typeof import('express');

/**
 * Compose a production-shaped express app from config — the "golden path" server
 * builder: correlation id → security headers → CORS → compression → JSON body →
 * request logging → before-hooks → your routes → after-hooks → health routes →
 * static/SPA → 404 → error handler, in that order. Every layer is opt-out, and
 * `beforeRoutes`/`routes`/`afterRoutes` are escape hatches so it composes instead
 * of dictating. Resolves the `express` peer at call time.
 *
 *   const app = createApp({
 *     cors: { whitelist: ['https://app.example.com'] },
 *     routes: (app) => app.get('/api/me', meHandler),
 *     health: { checks: [{ name: 'db', check: () => db.ping() }] },
 *   });
 *   app.listen(3000);
 */
export const createApp = (options: CreateAppOptions = {}): Express => {
  const mod = requirePeer<ExpressModule>('express', 'server');
  const express = ((mod as { default?: ExpressModule }).default ?? mod) as ExpressModule;
  const app = express();

  if (options.correlationId !== false) {
    app.use(correlationId(options.correlationId ?? {}));
  }
  if (options.securityHeaders !== false) {
    app.use(securityHeaders(options.securityHeaders ?? {}));
  }
  if (options.cors) {
    app.use(corsWhitelist(options.cors));
  }
  if (options.compression) {
    const mod = requirePeer<CompressionModule>('compression', 'server');
    const compression = (mod.default ?? mod) as (opts?: object) => RequestHandler;
    app.use(compression(typeof options.compression === 'object' ? options.compression : undefined));
  }
  if (options.json !== false) {
    app.use(express.json(typeof options.json === 'object' ? options.json : undefined));
  }
  if (options.requestLogger) {
    app.use(requestLogger(options.requestLogger));
  }

  options.beforeRoutes?.(app);
  options.routes?.(app);
  options.afterRoutes?.(app);

  if (options.health !== false) {
    addHealthRoutes(app, options.health ?? {});
  }
  if (options.static) {
    addStaticSpa(app, options.static);
  }
  if (options.notFound !== false) {
    app.use(notFoundHandler());
  }
  if (options.errorHandler !== false) {
    app.use(errorHandler(options.errorHandler ?? {}));
  }

  return app;
};
