import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global in-memory cache for query deduplication and persistence across renders
const queryCache = new Map<string, CacheEntry<unknown>>();
const pendingPromises = new Map<string, Promise<unknown>>();

export interface QueryOptions<T> {
  queryKey: (string | number | boolean)[];
  queryFn: () => Promise<T>;
  staleTime?: number; // ms before data is considered stale (default: 3 minutes)
  gcTime?: number; // ms before data is garbage collected from memory (default: 10 minutes)
  enabled?: boolean;
}

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<T | undefined>;
  dataUpdatedAt: number | null;
}

/**
 * Lightweight TanStack Query compatible hook providing staleTime, gcTime,
 * background deduplication, and loading/error states.
 */
export function useDataQuery<T>({
  queryKey,
  queryFn,
  staleTime = 3 * 60 * 1000, // 3 minutes
  gcTime = 10 * 60 * 1000, // 10 minutes
  enabled = true,
}: QueryOptions<T>): QueryResult<T> {
  const serializedKey = JSON.stringify(queryKey);

  // Initialize from cache if fresh
  const cached = queryCache.get(serializedKey) as CacheEntry<T> | undefined;
  const isCacheFresh = cached ? Date.now() - cached.timestamp < staleTime : false;

  const [data, setData] = useState<T | undefined>(cached?.data);
  const [isLoading, setIsLoading] = useState<boolean>(!isCacheFresh && enabled);
  const [isFetching, setIsFetching] = useState<boolean>(!isCacheFresh && enabled);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(cached?.timestamp ?? null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (isManualRefetch = false): Promise<T | undefined> => {
      if (!enabled) return;

      const now = Date.now();
      const currentCache = queryCache.get(serializedKey) as CacheEntry<T> | undefined;

      // If data is fresh and this isn't a manual refetch, return cached
      if (currentCache && now - currentCache.timestamp < staleTime && !isManualRefetch) {
        if (isMountedRef.current) {
          setData(currentCache.data);
          setDataUpdatedAt(currentCache.timestamp);
          setIsLoading(false);
          setIsFetching(false);
        }
        return currentCache.data;
      }

      if (isMountedRef.current) {
        setIsFetching(true);
        if (!currentCache?.data) {
          setIsLoading(true);
        }
      }

      try {
        // Reuse in-flight request if already pending for this key
        let promise = pendingPromises.get(serializedKey) as Promise<T> | undefined;
        if (!promise) {
          promise = queryFn();
          pendingPromises.set(serializedKey, promise);
        }

        const freshData = await promise;
        pendingPromises.delete(serializedKey);

        // Store in cache
        queryCache.set(serializedKey, {
          data: freshData,
          timestamp: Date.now(),
        });

        // Set garbage collection timer
        setTimeout(() => {
          const entry = queryCache.get(serializedKey);
          if (entry && Date.now() - entry.timestamp >= gcTime) {
            queryCache.delete(serializedKey);
          }
        }, gcTime);

        if (isMountedRef.current) {
          setData(freshData);
          setDataUpdatedAt(Date.now());
          setIsError(false);
          setError(null);
          setIsLoading(false);
          setIsFetching(false);
        }
        return freshData;
      } catch (err) {
        pendingPromises.delete(serializedKey);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setIsError(true);
          setError(errorObj);
          setIsLoading(false);
          setIsFetching(false);
        }
        return undefined;
      }
    },
    [serializedKey, enabled, staleTime, gcTime, queryFn]
  );

  useEffect(() => {
    executeFetch(false);
  }, [executeFetch]);

  const refetch = useCallback(() => executeFetch(true), [executeFetch]);

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  };
}
