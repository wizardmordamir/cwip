import { compileMongoMatcher } from './matchMongo';
import { compileSqlMatcher } from './matchSql';
import type { DbMockDatasource, DbMockRegistry, MongoCallArgs, MongoMockHandler, SqlMockHandler } from './types';

interface Entry {
  ds: DbMockDatasource;
  records: Record<string, unknown[]>;
  sqlMatch: (sql: string, params?: unknown[]) => SqlMockHandler | null;
  mongoMatch: (call: MongoCallArgs) => MongoMockHandler | null;
}

const compile = (ds: DbMockDatasource): Entry => ({
  ds,
  records: ds.records ?? {},
  sqlMatch: compileSqlMatcher(ds.sql ?? []),
  mongoMatch: compileMongoMatcher(ds.mongo ?? []),
});

/**
 * Create a multi-datasource DB mock registry. Register any mix of SQL/Mongo
 * datasources, then resolve queries against them — directly in tests, or via the
 * Bun driver injection (`installDbMocks`). Handlers can be hand-written or built
 * from captured fixtures (`registerFixtures`).
 *
 *   const reg = createDbMockRegistry();
 *   reg.register({ id: 'mainPg', kind: 'postgres', sql: [
 *     { query: 'select * from users where id = $1', rows: ({ params }) => [{ id: params[0] }] },
 *   ]});
 *   await reg.resolveSql('mainPg', 'SELECT * FROM users WHERE id = $1', [7]); // → [{ id: 7 }]
 */
export const createDbMockRegistry = (datasources: DbMockDatasource[] = []): DbMockRegistry => {
  const entries = new Map<string, Entry>();
  for (const ds of datasources) entries.set(ds.id, compile(ds));

  const mustGet = (id: string): Entry => {
    const e = entries.get(id);
    if (!e) throw new Error(`db-mock: no datasource registered with id "${id}"`);
    return e;
  };

  return {
    register(ds) {
      entries.set(ds.id, compile(ds));
    },
    get: (id) => entries.get(id)?.ds,
    list: () => [...entries.values()].map((e) => e.ds),

    async resolveSql(id, sql, params = []) {
      const e = mustGet(id);
      const handler = e.sqlMatch(sql, params);
      if (!handler) {
        if (e.ds.throwOnNoMatch) throw new Error(`db-mock[${id}]: no SQL handler matched: ${sql}`);
        return [];
      }
      return handler.rows({ sql, params, records: e.records });
    },

    async resolveMongo(id, call) {
      const e = mustGet(id);
      const handler = e.mongoMatch(call);
      if (!handler) {
        if (e.ds.throwOnNoMatch)
          throw new Error(`db-mock[${id}]: no Mongo handler matched: ${call.collection}.${call.operation}`);
        return call.operation === 'find' || call.operation === 'aggregate' ? [] : null;
      }
      return handler.result({ call, records: e.records });
    },

    addSqlHandlers(id, handlers) {
      const e = mustGet(id);
      e.ds.sql = [...(e.ds.sql ?? []), ...handlers];
      e.sqlMatch = compileSqlMatcher(e.ds.sql);
    },

    addMongoHandlers(id, handlers) {
      const e = mustGet(id);
      e.ds.mongo = [...(e.ds.mongo ?? []), ...handlers];
      e.mongoMatch = compileMongoMatcher(e.ds.mongo);
    },
  };
};
