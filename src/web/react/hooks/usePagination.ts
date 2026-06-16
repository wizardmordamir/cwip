import { useEffect, useMemo, useState } from 'react';

export interface PaginationRange {
  /** 1-based current page, clamped into `[1, pageCount]`. */
  page: number;
  pageCount: number;
  /** 0-based index of the first item on this page (for "X–Y of Z" labels). */
  startIndex: number;
}

/** Pure pagination math: clamps the page and derives the page count + start
 *  index. Shared by `usePagination` and testable on its own. */
export const paginationRange = (total: number, page: number, pageSize: number): PaginationRange => {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const clamped = Math.min(Math.max(1, page), pageCount);
  return { page: clamped, pageCount, startIndex: (clamped - 1) * pageSize };
};

export interface UsePaginationOptions {
  /** Items per page (default 25). */
  pageSize?: number;
  /** When this value changes, the page resets to 1 (e.g. a new search term). */
  resetKey?: unknown;
}

export interface UsePaginationResult<T> {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  pageCount: number;
  total: number;
  /** The slice of items for the current page. */
  pageItems: T[];
  startIndex: number;
}

/**
 * Client-side pagination over an in-memory array. Keeps page/pageSize state,
 * clamps the page when the data shrinks, and returns the current page's slice.
 * Pair with a `<Pagination>` control. For server-side (offset/limit) datasets,
 * drive the control directly instead of this hook.
 */
export const usePagination = <T>(items: T[], options: UsePaginationOptions = {}): UsePaginationResult<T> => {
  const { pageSize: initialPageSize = 25, resetKey } = options;
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const total = items.length;
  const { page: clamped, pageCount, startIndex } = paginationRange(total, page, pageSize);

  // Snap back to page 1 whenever the reset key (or page size) changes. These deps
  // are intentional triggers, not values read in the body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on these changing
  useEffect(() => setPage(1), [resetKey, pageSize]);

  // Never strand the user past the last page after the data shrinks.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => items.slice(startIndex, startIndex + pageSize), [items, startIndex, pageSize]);

  return { page: clamped, setPage, pageSize, setPageSize, pageCount, total, pageItems, startIndex };
};
