import { createServer, type Server } from 'node:http';
import type { Express } from 'express';
import {
  createShutdownManager,
  type ShutdownCallback,
  type ShutdownManager,
} from '../node/shutdown/createShutdownManager';
import { type CreateAppOptions, createApp } from './createApp';

export interface ServeAppOptions extends CreateAppOptions {
  /** Port to listen on (`0` picks an ephemeral port — read it back from `server.address()`). */
  port: number;
  /** Interface to bind (optional; defaults to all). */
  host?: string;
  /** Extra cleanup run on shutdown — `server.close()` is registered for you. */
  onShutdown?: ShutdownCallback | ShutdownCallback[];
  /** Max ms to wait for shutdown callbacks (default 10_000). */
  shutdownTimeoutMs?: number;
  /** Observe a shutdown callback that throws. */
  onShutdownError?: (error: unknown) => void;
  /** Called once the server is listening. */
  onListen?: (info: { port: number; host?: string; server: Server }) => void;
  /** Install SIGTERM/SIGINT handlers that trigger shutdown (default true). */
  handleSignals?: boolean;
}

export interface ServedApp {
  app: Express;
  server: Server;
  /** The shutdown coordinator — register more cleanups, or call `shutdown()`. */
  shutdown: ShutdownManager;
}

/**
 * The whole-server convenience on top of {@link createApp}: build the app, attach
 * it to an HTTP server, wire a graceful-shutdown manager (closing the server +
 * your `onShutdown` cleanups on SIGTERM/SIGINT), and start listening. Resolves
 * once the server is up. This is the "hook in what you need, get the rest free"
 * entry — middleware, static/SPA, health, 404/errors come from createApp.
 *
 *   const { server, shutdown } = await serveApp({
 *     port: 3000,
 *     cors: { whitelist: ['https://app.example.com'] },
 *     static: { dir: 'dist/public' },
 *     routes: (app) => app.use('/api', apiRouter),
 *     health: { checks: [{ name: 'db', check: () => db.ping() }] },
 *     onShutdown: () => db.disconnect(),
 *   });
 */
export const serveApp = (options: ServeAppOptions): Promise<ServedApp> => {
  const {
    port,
    host,
    onShutdown,
    shutdownTimeoutMs,
    onShutdownError,
    onListen,
    handleSignals = true,
    ...appOptions
  } = options;

  const app = createApp(appOptions);
  const server = createServer(app);
  const shutdown = createShutdownManager({ timeoutMs: shutdownTimeoutMs, onError: onShutdownError });

  shutdown.register(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const extra = Array.isArray(onShutdown) ? onShutdown : onShutdown ? [onShutdown] : [];
  for (const cb of extra) shutdown.register(cb);
  if (handleSignals) shutdown.listen();

  return new Promise<ServedApp>((resolve) => {
    const done = () => {
      onListen?.({ port, host, server });
      resolve({ app, server, shutdown });
    };
    if (host) server.listen(port, host, done);
    else server.listen(port, done);
  });
};
