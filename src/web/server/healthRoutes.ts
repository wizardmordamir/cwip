import type { Express, Request, Response } from 'express';
import { getMessageFromError } from '../../core/object/getMessageFromError';

/** A named readiness check; throwing (or rejecting) marks it failed. */
export interface HealthCheck {
  name: string;
  check: () => Promise<void> | void;
}

export interface HealthRoutesOptions {
  /** Base path for the routes (default `/health`). */
  basePath?: string;
  /** Dependency checks run by readiness (DB pings, etc.). Liveness ignores them. */
  checks?: HealthCheck[];
}

/**
 * Mount `GET <base>/liveness` (always 200 — "the process is up") and
 * `GET <base>/readiness` (200 only if every injected check passes, else 503 with
 * the failures). Checks are injected, so this carries no DB/app coupling.
 *
 *   addHealthRoutes(app, { checks: [{ name: 'db', check: () => db.ping() }] });
 */
export const addHealthRoutes = (app: Express, options: HealthRoutesOptions = {}): void => {
  const base = options.basePath ?? '/health';
  const checks = options.checks ?? [];

  app.get(`${base}/liveness`, (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get(`${base}/readiness`, async (_req: Request, res: Response) => {
    const failures = (
      await Promise.all(
        checks.map(async ({ name, check }) => {
          try {
            await check();
            return null;
          } catch (err) {
            return { name, error: getMessageFromError(err) };
          }
        }),
      )
    ).filter((f): f is { name: string; error: string } => f !== null);

    if (failures.length > 0) {
      res.status(503).json({ status: 'unavailable', failures });
      return;
    }
    res.status(200).json({ status: 'ok' });
  });
};
