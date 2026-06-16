import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface SecurityHeadersOptions {
  /** `Content-Security-Policy`. Default a strict `'self'` policy; `false` to omit. */
  contentSecurityPolicy?: string | false;
  /** `Strict-Transport-Security`. Default 1y + subdomains; `false` to omit. */
  hsts?: string | false;
  /** `Referrer-Policy` (default `strict-origin-when-cross-origin`). */
  referrerPolicy?: string;
  /** `Cross-Origin-Embedder-Policy` (default `require-corp`); `false` to omit. */
  crossOriginEmbedderPolicy?: string | false;
  /** `Cross-Origin-Opener-Policy` (default `same-origin`). */
  crossOriginOpenerPolicy?: string;
  /** `Cross-Origin-Resource-Policy` (default `same-origin`). */
  crossOriginResourcePolicy?: string;
  /** `X-Frame-Options` (default `DENY`). */
  frameOptions?: string;
}

const DEFAULT_CSP = ["default-src 'self'", "base-uri 'self'", "frame-ancestors 'self'", "object-src 'none'"].join('; ');

/**
 * Express middleware that sets a hardened, zero-config set of security response
 * headers (CSP, HSTS, COEP/COOP/CORP, `X-Content-Type-Options`, referrer policy,
 * `X-Frame-Options`). Generalized from an app's middleware — the defaults are
 * generic (no app-specific CSP allowlists), and every header is overridable or
 * removable (`false`). Pure: needs only express *types*, no runtime dependency,
 * so it works under any express-compatible server.
 *
 *   app.use(securityHeaders());
 *   app.use(securityHeaders({ contentSecurityPolicy: false })); // e.g. behind a gateway
 */
export const securityHeaders = (options: SecurityHeadersOptions = {}): RequestHandler => {
  const csp = options.contentSecurityPolicy ?? DEFAULT_CSP;
  const hsts = options.hsts ?? 'max-age=31536000; includeSubDomains';
  const coep = options.crossOriginEmbedderPolicy ?? 'require-corp';

  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', options.frameOptions ?? 'DENY');
    res.setHeader('Referrer-Policy', options.referrerPolicy ?? 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', options.crossOriginOpenerPolicy ?? 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', options.crossOriginResourcePolicy ?? 'same-origin');
    if (coep !== false) {
      res.setHeader('Cross-Origin-Embedder-Policy', coep);
    }
    if (hsts !== false) {
      res.setHeader('Strict-Transport-Security', hsts);
    }
    if (csp !== false) {
      res.setHeader('Content-Security-Policy', csp);
    }
    next();
  };
};
