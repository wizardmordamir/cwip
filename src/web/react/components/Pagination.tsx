import { cx, resolveClass, type StyleableProps } from '../styling';

const ELLIPSIS = 'ellipsis';
type PageToken = number | typeof ELLIPSIS;

// Windowed page list: always show first/last, the current page, and `siblingCount`
// neighbours on each side, collapsing the rest into ellipses. e.g. 1 … 4 5 [6] 7 8 … 20
const buildRange = (page: number, pageCount: number, siblingCount: number): PageToken[] => {
  const totalShown = siblingCount * 2 + 5; // first+last + current + 2 siblings + 2 ellipses
  if (pageCount <= totalShown) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;

  const tokens: PageToken[] = [1];
  if (showLeftEllipsis) tokens.push(ELLIPSIS);
  for (let p = showLeftEllipsis ? left : 2; p <= (showRightEllipsis ? right : pageCount - 1); p++) tokens.push(p);
  if (showRightEllipsis) tokens.push(ELLIPSIS);
  tokens.push(pageCount);
  return tokens;
};

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" role="img">
    <title>{dir === 'left' ? 'Previous' : 'Next'}</title>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
);

export type PaginationSlot = 'root';

export interface PaginationProps extends StyleableProps<PaginationSlot> {
  page: number; // 1-based current page
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Context for the "X–Y of Z" range label. */
  total?: number;
  pageSize?: number;
  /** Optional rows-per-page selector. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  /** Pages shown on each side of the current page (default 1). */
  siblingCount?: number;
  className?: string;
}

const NAV_BTN =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-300 px-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800';

/**
 * A pagination bar: a "X–Y of Z" range label, an optional rows-per-page selector,
 * and windowed page-number controls with Prev/Next. Fully controlled — drive it
 * with `usePagination` (client-side) or your own offset/limit state. Renders
 * nothing when there's a single page and no size selector.
 */
export const Pagination = ({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  siblingCount = 1,
  className,
  classNames,
  unstyled,
}: PaginationProps) => {
  const showSizes = Boolean(pageSizeOptions?.length && onPageSizeChange);
  if (pageCount <= 1 && !showSizes) return null;

  const go = (p: number) => onPageChange(Math.min(Math.max(p, 1), pageCount));
  const tokens = buildRange(page, pageCount, siblingCount);

  let rangeLabel: string | null = null;
  if (typeof total === 'number' && typeof pageSize === 'number') {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    rangeLabel = `${start}–${end} of ${total}`;
  }

  return (
    <div
      className={resolveClass(
        'flex flex-wrap items-center justify-between gap-3',
        classNames?.root ?? className,
        unstyled,
      )}
    >
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        {rangeLabel && <span>{rangeLabel}</span>}
        {showSizes && (
          <label className="flex items-center gap-1.5">
            <span>Per page</span>
            <select
              aria-label="Rows per page"
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            >
              {pageSizeOptions?.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            className={NAV_BTN}
            disabled={page <= 1}
            onClick={() => go(page - 1)}
          >
            <Chevron dir="left" />
          </button>

          {tokens.map((token, i) =>
            token === ELLIPSIS ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis position is stable within a render
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
                …
              </span>
            ) : (
              <button
                type="button"
                key={token}
                aria-label={`Page ${token}`}
                aria-current={token === page ? 'page' : undefined}
                onClick={() => go(token)}
                className={cx(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition',
                  token === page
                    ? 'bg-accent text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
                )}
              >
                {token}
              </button>
            ),
          )}

          <button
            type="button"
            aria-label="Next page"
            className={NAV_BTN}
            disabled={page >= pageCount}
            onClick={() => go(page + 1)}
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </div>
  );
};
