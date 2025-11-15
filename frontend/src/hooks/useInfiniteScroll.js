import { useState, useCallback, useEffect } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

/**
 * useInfiniteScroll Hook
 * Handles infinite scroll pagination
 */
export function useInfiniteScroll(fetchFn, options = {}) {
  const {
    initialPage = 1,
    pageSize = 20,
    enabled = true,
    ...fetchOptions
  } = options;

  const [data, setData] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFn(page + 1, pageSize, fetchOptions);
      
      if (result.data && Array.isArray(result.data)) {
        setData(prev => [...prev, ...result.data]);
        setPage(prev => prev + 1);
        setHasMore(result.data.length === pageSize && (result.hasMore !== false));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, hasMore, loading, enabled, fetchFn, fetchOptions]);

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, loading, loadMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, [initialPage]);

  return {
    data,
    loadMore,
    reset,
    hasMore,
    loading,
    error,
    elementRef
  };
}


