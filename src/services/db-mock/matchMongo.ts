import type { MongoCallArgs, MongoMockHandler } from './types';

/**
 * Compile Mongo handlers into a matcher keyed by `collection` + `operation`, with
 * an optional `when` predicate to disambiguate (e.g. match a specific filter).
 * The most-specific handler (one with a `when`) is preferred over a catch-all.
 */
export const compileMongoMatcher = (
  handlers: MongoMockHandler[],
): ((call: MongoCallArgs) => MongoMockHandler | null) => {
  // Predicated handlers first, so a specific `when` wins over a catch-all for the same op.
  const ordered = [...handlers].sort((a, b) => (b.when ? 1 : 0) - (a.when ? 1 : 0));
  return (call) => {
    for (const h of ordered) {
      if (h.collection !== call.collection || h.operation !== call.operation) continue;
      if (h.when && !h.when(call)) continue;
      return h;
    }
    return null;
  };
};

/** Normalize a driver call into the matcher's `MongoCallArgs` shape. */
export const toMongoCall = (collection: string, operation: string, args: unknown[]): MongoCallArgs => {
  const call: MongoCallArgs = { collection, operation, args };
  if (operation === 'insertOne' || operation === 'insertMany') call.doc = args[0];
  else if (operation === 'aggregate') call.pipeline = args[0] as unknown[];
  else {
    call.filter = args[0];
    if (operation === 'updateOne' || operation === 'updateMany') call.update = args[1];
  }
  return call;
};
