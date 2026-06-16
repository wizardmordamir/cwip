import type { Options } from 'ajv';
import { requirePeer } from '../_internal/requirePeer';

// Type-only views of the peer (erased at build, so no runtime dependency).
type AjvModule = typeof import('ajv');
type AjvCtor = AjvModule['default'];
export type Ajv = InstanceType<AjvCtor>;

/**
 * Construct a configured Ajv instance, resolving the optional `ajv` peer at call
 * time (clear error if it's missing — see `requirePeer`). Defaults mirror the
 * common server setup: coerce types, strip unknown properties, apply schema
 * defaults, and collect all errors (not just the first).
 *
 *   const ajv = createAjv({ removeAdditional: false });
 */
export const createAjv = (options: Options = {}): Ajv => {
  const mod = requirePeer<AjvModule>('ajv', 'schema');
  const Ctor = ((mod as { default?: AjvCtor }).default ?? mod) as AjvCtor;
  return new Ctor({
    coerceTypes: true,
    removeAdditional: true,
    useDefaults: true,
    allErrors: true,
    ...options,
  });
};

let shared: Ajv | null = null;

/** A lazily-created, shared default Ajv instance (compiled schemas are cached on it). */
export const getAjv = (): Ajv => {
  if (!shared) {
    shared = createAjv();
  }
  return shared;
};
