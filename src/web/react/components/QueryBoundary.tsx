import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { SkeletonList } from './Skeleton';

// The minimal shape read off a TanStack Query result. Accepting a structural type
// (instead of UseQueryResult) keeps the boundary usable with any query-like object
// — and free of a @tanstack/react-query dependency.
export interface QueryLike {
  isLoading: boolean;
  isError?: boolean;
}

export interface QueryBoundaryProps {
  /** Pass the whole query result… (`<QueryBoundary query={useThing()}>`). */
  query?: QueryLike;
  /** …or the flags directly when you don't have a single query object. */
  isLoading?: boolean;
  isError?: boolean;
  /** Shown only on the FIRST load (no cached data yet). A layout-shaped skeleton
   *  here is what kills the loading flash. Defaults to `<SkeletonList />`. */
  fallback?: ReactNode;
  /** Shown when the query errors. */
  errorFallback?: ReactNode;
  children: ReactNode;
}

const DefaultError = () => (
  <EmptyState title="Something went wrong" description="We couldn't load this just now. Try refreshing the page." />
);

/**
 * Standardizes the loading / error / content gate copy-pasted across pages as
 * `isLoading ? <spinner> : <content>`. Keys off `isLoading` (true only when there
 * is no data at all — background refetches keep it false), so real content stays
 * mounted across navigations and refetches instead of flashing.
 */
export const QueryBoundary = ({ query, isLoading, isError, fallback, errorFallback, children }: QueryBoundaryProps) => {
  const loading = isLoading ?? query?.isLoading ?? false;
  const errored = isError ?? query?.isError ?? false;

  if (loading) return <>{fallback ?? <SkeletonList />}</>;
  if (errored) return <>{errorFallback ?? <DefaultError />}</>;
  return <>{children}</>;
};
