import { type QueryKey, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// IMPORTANT: this factory's PUBLIC surface is deliberately free of @tanstack's
// class-shaped types (UseQueryResult/UseQueryOptions/QueryClient). Those carry
// `#private` members, so when cwip is bun-linked and resolves a DIFFERENT
// @tanstack copy than the consuming app, tsc treats the two as distinct nominal
// types — breaking every call site, and (in a `composite` app) emitting "not
// portable" TS2883 on any exported hook that wraps these. By exposing only
// cwip's own copy-safe interfaces below (built from plain structural types and
// `QueryKey`, which is just `readonly unknown[]`), the factory works across the
// link with no @tanstack version/identity coupling. Runtime still needs a single
// @tanstack instance — dedupe it in the app's bundler config, like React.

export type { QueryKey };

/** The two toast calls the mutation factory makes. Map these to your app's toaster. */
export interface ApiToaster {
  success: (message: ReactNode) => void;
  error: (error: unknown) => void;
}

/** A copy-safe subset of TanStack query options (no class-typed fields like the
 *  `enabled` predicate form, so the public API doesn't depend on the consumer
 *  resolving the same @tanstack copy). */
export interface ApiQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
  retry?: boolean | number;
  placeholderData?: T | ((previous: T | undefined) => T | undefined);
  select?: (data: T) => T;
}

/** The query result fields apps actually read (a structural subset of TanStack's
 *  UseQueryResult, so it stays copy-safe and nameable across the link). */
export interface ApiQueryResult<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
}

/** Per-call mutate callbacks (the optional 2nd arg to `mutate`/`mutateAsync`). */
export interface MutateOptions<TArgs, TData> {
  onSuccess?: (data: TData, args: TArgs) => void;
  onError?: (error: unknown, args: TArgs) => void;
  onSettled?: (data: TData | undefined, error: unknown, args: TArgs) => void;
}

/** The mutation result fields apps actually read. `mutate`/`mutateAsync` take the
 *  same optional per-call options object as TanStack's. */
export interface ApiMutationResult<TArgs, TData> {
  mutate: (args: TArgs, options?: MutateOptions<TArgs, TData>) => void;
  mutateAsync: (args: TArgs, options?: MutateOptions<TArgs, TData>) => Promise<TData>;
  data: TData | undefined;
  error: unknown;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

/** The minimal query-client surface the `invalidate` escape hatch needs. The
 *  `setQueryData` updater may return `undefined` (a no-op), like TanStack's. */
export interface QueryClientLike {
  invalidateQueries: (filters: { queryKey: QueryKey }) => void;
  setQueryData: <T>(queryKey: QueryKey, updater: T | undefined | ((old: T | undefined) => T | undefined)) => void;
  getQueryData: <T>(queryKey: QueryKey) => T | undefined;
}

export interface ApiHooksConfig<Client> {
  /** Returns the request client passed to every query/mutation fn (e.g. an authed
   *  request function). A hook — called at the top of each generated hook. */
  useClient: () => Client;
  /** Returns the app's toaster, used for `successToast` / error-on-failure. Omit to
   *  disable automatic toasts. A hook. */
  useToaster?: () => ApiToaster;
}

export interface ApiQueryConfig<Client, T> extends ApiQueryOptions<T> {
  queryKey: QueryKey;
  /** Build the promise from the injected client. */
  queryFn: (client: Client) => Promise<T>;
  /** Value to use when the resolved data is `null`/`undefined`. */
  fallback?: T;
}

export interface ApiMutationConfig<Client, TArgs, TData> {
  mutationFn: (client: Client, args: TArgs) => Promise<TData>;
  /** Toast shown on success — a string, or a fn of (data, args). Needs `useToaster`. */
  successToast?: string | ((data: TData, args: TArgs) => string);
  /** Query keys to invalidate on success (array or a fn of (data, args)). */
  invalidateKeys?: QueryKey[] | ((data: TData, args: TArgs) => QueryKey[]);
  /** Escape hatch for richer cache work (optimistic patches, cross-feature invalidation). */
  invalidate?: (queryClient: QueryClientLike, data: TData, args: TArgs) => void;
  /** Extra success side effects (e.g. set local state). Runs after toast/invalidate. */
  onSuccess?: (data: TData, args: TArgs) => void;
  /** Extra error handling, in addition to the automatic error toast. */
  onError?: (error: unknown, args: TArgs) => void;
}

export interface ApiHooks<Client> {
  useApiQuery: <T>(config: ApiQueryConfig<Client, T>) => ApiQueryResult<T>;
  useApiMutation: <TArgs = void, TData = unknown>(
    config: ApiMutationConfig<Client, TArgs, TData>,
  ) => ApiMutationResult<TArgs, TData>;
}

/**
 * Build a pair of TanStack-Query hooks bound to your app's request client + toaster.
 * Standardizes the data-fetching boilerplate every app reinvents: apply a fallback
 * on empty queries; on a mutation, fire a success toast, invalidate query keys, and
 * surface errors as a toast — all declaratively.
 *
 * Transport-agnostic: the `Client` is whatever you inject (an authed request fn, a
 * plain api module, or nothing), passed to every `queryFn`/`mutationFn`.
 *
 *   const { useApiQuery, useApiMutation } = createApiHooks({
 *     useClient: () => useAuth().request,
 *     useToaster: () => { const t = useToast(); return { success: t.success, error: t.error }; },
 *   });
 *
 * Requires `@tanstack/react-query` (an optional peer) wrapped in a QueryClientProvider.
 */
export const createApiHooks = <Client>({ useClient, useToaster }: ApiHooksConfig<Client>): ApiHooks<Client> => {
  const useApiQuery = <T>({
    queryKey,
    queryFn,
    fallback,
    ...options
  }: ApiQueryConfig<Client, T>): ApiQueryResult<T> => {
    const client = useClient();
    // The public ApiQueryOptions is a copy-safe subset; cast to @tanstack's option
    // type only here, internally (it never reaches the public API).
    return useQuery<T>({
      queryKey,
      queryFn: async () => {
        const data = await queryFn(client);
        return (data ?? fallback) as T;
      },
      ...options,
    } as UseQueryOptions<T>) as ApiQueryResult<T>;
  };

  const useApiMutation = <TArgs = void, TData = unknown>({
    mutationFn,
    successToast,
    invalidateKeys,
    invalidate,
    onSuccess,
    onError,
  }: ApiMutationConfig<Client, TArgs, TData>): ApiMutationResult<TArgs, TData> => {
    const client = useClient();
    const queryClient = useQueryClient();
    const toaster = useToaster?.();
    return useMutation<TData, unknown, TArgs>({
      mutationFn: (args) => mutationFn(client, args),
      onSuccess: (data, args) => {
        if (successToast && toaster) {
          toaster.success(typeof successToast === 'function' ? successToast(data, args) : successToast);
        }
        const keys = typeof invalidateKeys === 'function' ? invalidateKeys(data, args) : invalidateKeys;
        for (const queryKey of keys ?? []) queryClient.invalidateQueries({ queryKey });
        invalidate?.(queryClient as QueryClientLike, data, args);
        onSuccess?.(data, args);
      },
      onError: (error, args) => {
        toaster?.error(error);
        onError?.(error, args);
      },
    }) as ApiMutationResult<TArgs, TData>;
  };

  return { useApiQuery, useApiMutation };
};
