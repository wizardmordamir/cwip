import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

/**
 * Resolve an optional **peer dependency** at call time, throwing a clear,
 * actionable error when it isn't installed instead of a cryptic
 * `Cannot find module`. This is how the framework subpaths (`cwip/schema`,
 * `cwip/server`, `cwip/mongo`, `cwip/excel`) stay dependency-free: they
 * `import type` from the peer (erased at build) and call `requirePeer` inside
 * their factories for the runtime value, so importing the subpath never requires
 * the peer — only *using* it does.
 *
 *   const ajv = requirePeer<typeof import('ajv')>('ajv', 'schema');
 *
 * Internal (not exported from any public barrel).
 */
export const requirePeer = <T>(name: string, subpath: string): T => {
  try {
    return nodeRequire(name) as T;
  } catch {
    throw new Error(
      `cwip/${subpath} requires the optional peer dependency "${name}", which is not installed. ` +
        `Install it in your project (e.g. \`npm install ${name}\`) to use cwip/${subpath}.`,
    );
  }
};
