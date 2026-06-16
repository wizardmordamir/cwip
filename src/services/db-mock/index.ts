// cwip/db-mock — multi-config, multi-database mock registry (SQL + Mongo), with
// capture→sanitize→replay fixtures and a type-generation seam (cwip/shape). The
// Bun driver injection that routes pg/mysql2/mssql/mongodb through a registry is
// `installDbMocks` in cwip/testing.
export * from './fixtures';
export * from './matchMongo';
export * from './matchSql';
export * from './registry';
export * from './types';
