/**
 * Standard SQL Server DATETIME format.
 * Note: Use 'yyyy' for date-fns compatibility to avoid week-year bugs.
 */
export const MS_SQL_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * SQL Server DATETIME2 format with millisecond precision.
 */
export const MS_SQL_DATETIME_PRECISION_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

/**
 * SQL Server DATE only format.
 */
export const MS_SQL_DATE_FORMAT = 'YYYY-MM-DD';
