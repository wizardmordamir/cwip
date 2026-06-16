import { Pagination } from '../components/Pagination';

type Column = { name: string; type?: string };

type Props = {
  columns: Column[];
  rows: Record<string, unknown>[];
  // Total row count across all pages (defaults to rows.length when omitted —
  // single-page mode, no pager).
  total?: number;
  // Page size. Defaults to rows.length (or 1) so a single-page table never pages.
  limit?: number;
  // Zero-based offset of the first row shown. Defaults to 0.
  offset?: number;
  // When provided (with total/limit), renders a self-contained pager that calls
  // back with the new offset. Omit for a static, single-page table.
  onPageChange?: (offset: number) => void;
};

const renderCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// A self-contained, scrollable, read-only grid of tabular results (query output,
// JSONL rows, etc.) with an optional inline pager. No external pagination
// dependency — pass total/limit/offset/onPageChange to enable paging.
export const DataTable = ({ columns, rows, total, limit, offset = 0, onPageChange }: Props) => {
  const totalRows = total ?? rows.length;
  const pageSize = limit ?? rows.length ?? 1;
  const pageCount = Math.max(1, Math.ceil(totalRows / Math.max(1, pageSize)));
  const page = Math.floor(offset / Math.max(1, pageSize)) + 1;
  const showPager = !!onPageChange && pageCount > 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {totalRows === 0 ? 'No rows match.' : `Showing ${offset + 1}–${offset + rows.length} of ${totalRows}`}
      </p>
      <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="border border-gray-200 px-2 py-1 text-left dark:border-gray-800"
                  title={col.type}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              // Results are read-only and may lack a stable id; index is fine.
              // biome-ignore lint/suspicious/noArrayIndexKey: read-only result rows have no stable id
              <tr key={`row-${rowIndex}`} className="odd:bg-gray-50 dark:odd:bg-gray-900/40">
                {columns.map((col) => (
                  <td
                    key={col.name}
                    className="max-w-md whitespace-pre-wrap break-words border border-gray-200 px-2 py-1 align-top dark:border-gray-800"
                  >
                    {renderCell(row[col.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPager && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={(p) => onPageChange?.((p - 1) * pageSize)}
          className="flex flex-wrap items-center justify-center gap-1"
        />
      )}
    </div>
  );
};

// Back-compat alias for ca's name (DataResultsTable). Prefer `DataTable`.
export const ResultsTable = DataTable;
