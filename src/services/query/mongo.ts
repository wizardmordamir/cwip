import type { Combinator, Condition } from './types';

// MongoDB query construction from the same structured Condition[] the SQL builder
// uses, so one visual builder drives both. Produces a find description (filter +
// options) for the driver, and a copyable mongosh string.

export interface MongoFindSpec {
  collection: string;
  /** A ready-made filter object; if omitted, build from `conditions`. */
  filter?: Record<string, unknown>;
  conditions?: Condition[];
  conditionCombinator?: Combinator;
  projection?: Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface BuiltMongoFind {
  collection: string;
  filter: Record<string, unknown>;
  options: { projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1>; limit?: number; skip?: number };
}

// Translate a SQL-style LIKE pattern (% and _) into an anchored RegExp source.
const likeToRegex = (pattern: string): RegExp => {
  let out = '^';
  for (const ch of String(pattern)) {
    if (ch === '%') out += '.*';
    else if (ch === '_') out += '.';
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
};

const oneCondition = (c: Condition): Record<string, unknown> => {
  const { column, op, value } = c;
  switch (op) {
    case '=':
      return { [column]: value };
    case '!=':
      return { [column]: { $ne: value } };
    case '<':
      return { [column]: { $lt: value } };
    case '<=':
      return { [column]: { $lte: value } };
    case '>':
      return { [column]: { $gt: value } };
    case '>=':
      return { [column]: { $gte: value } };
    case 'in':
      return { [column]: { $in: Array.isArray(value) ? value : [value] } };
    case 'not in':
      return { [column]: { $nin: Array.isArray(value) ? value : [value] } };
    case 'is null':
      return { [column]: null };
    case 'is not null':
      return { [column]: { $ne: null } };
    case 'between': {
      const [a, b] = Array.isArray(value) ? value : [value, value];
      return { [column]: { $gte: a, $lte: b } };
    }
    case 'like':
      return { [column]: { $regex: likeToRegex(String(value)) } };
    case 'not like':
      return { [column]: { $not: likeToRegex(String(value)) } };
    default:
      return { [column]: value };
  }
};

/** Build a Mongo filter object from the shared Condition[] model. */
export const conditionsToMongoFilter = (
  conditions: Condition[] | undefined,
  combinator: Combinator = 'and',
): Record<string, unknown> => {
  const parts = (conditions ?? []).filter((c) => c.column).map(oneCondition);
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return combinator === 'or' ? { $or: parts } : { $and: parts };
};

/** Resolve a find spec into { collection, filter, options } for the driver. */
export const buildMongoFind = (spec: MongoFindSpec): BuiltMongoFind => {
  const filter = spec.filter ?? conditionsToMongoFilter(spec.conditions, spec.conditionCombinator);
  const options: BuiltMongoFind['options'] = {};
  if (spec.projection && Object.keys(spec.projection).length) options.projection = spec.projection;
  if (spec.sort && Object.keys(spec.sort).length) options.sort = spec.sort;
  if (spec.limit != null) options.limit = Math.trunc(spec.limit);
  if (spec.skip != null) options.skip = Math.trunc(spec.skip);
  return { collection: spec.collection, filter, options };
};

// RegExp doesn't JSON.stringify usefully; render it as a mongosh /pattern/ literal.
const mongoJson = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val instanceof RegExp ? `__RE__${val.source}__RE__` : val)).replace(
    /"__RE__(.*?)__RE__"/g,
    (_m, src) => `/${src}/`,
  );

/** A copyable mongosh expression: db.coll.find(filter, projection).sort(...).limit(n). */
export const toMongoShell = (spec: MongoFindSpec): string => {
  const { collection, filter, options } = buildMongoFind(spec);
  let out = `db.${collection}.find(${mongoJson(filter)}`;
  if (options.projection) out += `, ${mongoJson(options.projection)}`;
  out += ')';
  if (options.sort) out += `.sort(${mongoJson(options.sort)})`;
  if (options.skip != null) out += `.skip(${options.skip})`;
  if (options.limit != null) out += `.limit(${options.limit})`;
  return out;
};
