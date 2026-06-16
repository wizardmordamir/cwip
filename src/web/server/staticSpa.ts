import type { Express, NextFunction, Request, Response } from 'express';
import { requirePeer } from '../../core/_internal/requirePeer';

export interface StaticSpaOptions {
  /** Directory to serve static files from (e.g. a built SPA's dist). */
  dir: string;
  /** SPA entry file served for client-routed GETs (default `index.html`). */
  index?: string;
  /** Requests under this prefix are treated as API — they never get the SPA
   * fallback, so an unmatched `/api/*` falls through to the JSON 404. Default `/api`. */
  apiPrefix?: string;
  /** Cache-Control max-age (seconds) for static assets. Default 0. */
  maxAge?: number;
  /** Serve static files but skip the index.html SPA fallback. Default false. */
  noFallback?: boolean;
}

type ExpressModule = typeof import('express');

/**
 * Serve a static directory and (by default) fall back to its `index.html` for
 * client-routed GETs — the standard SPA-hosting shape. API requests
 * (`apiPrefix`) and non-HTML requests are left to fall through so an unmatched
 * `/api/*` still returns the JSON 404 rather than HTML. Mount AFTER your routes
 * and any health routes, before the 404/error handlers (createApp does this).
 *
 *   addStaticSpa(app, { dir: 'dist/public' });
 */
export const addStaticSpa = (app: Express, options: StaticSpaOptions): void => {
  const mod = requirePeer<ExpressModule>('express', 'server');
  const express = ((mod as { default?: ExpressModule }).default ?? mod) as ExpressModule;
  const { dir, index = 'index.html', apiPrefix = '/api', maxAge = 0, noFallback = false } = options;

  app.use(express.static(dir, { maxAge }));

  if (noFallback) return;
  // Catch-all GET → the SPA entry. Regex (not '*') for Express 5 compatibility.
  app.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (apiPrefix && req.path.startsWith(apiPrefix)) return next();
    if (!req.accepts('html')) return next();
    res.sendFile(index, { root: dir }, (err) => {
      if (err) next();
    });
  });
};
