import { useState, useEffect, useRef } from 'react';
import cacheManager from '../services/cache';
import api from '../services/api';
import { useRealtime } from '../realtime/useRealtime';

/**
 * useCachedData Hook
 * Fetches data with caching support
 */
export function useCachedData(url, options = {}) {
  const {
    params = {},
    enabled = true,
    cacheKey = null,
    ttl = null,
    refetchOnMount = false,
    ...fetchOptions
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const key = cacheKey || cacheManager.generateKey(url, params);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Check cache first (unless refetchOnMount is true)
    if (!refetchOnMount) {
      const cached = cacheManager.get(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch data
    const fetchData = async () => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(url, {
          params,
          signal: abortControllerRef.current.signal,
          ...fetchOptions
        });

        // Cache the full response.data object to preserve structure (success, data, pagination, etc.)
        // This matches the fix in api.js to ensure consistent response format
        const responseData = response.data; // Cache full response object, not just nested data

        // Cache the response
        cacheManager.set(key, responseData, ttl);

        setData(responseData);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // Request was cancelled
        }
        setError(err);
        setData(null);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    };

    fetchData();

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, JSON.stringify(params), enabled, refetchOnMount, key, ttl]);

  // Invalidate cache
  const invalidate = () => {
    cacheManager.delete(key);
  };

  // Refetch data
  const refetch = async () => {
    cacheManager.delete(key);
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(url, { params, ...fetchOptions });
      // Cache the full response.data object to preserve structure (success, data, pagination, etc.)
      const responseData = response.data; // Cache full response object, not just nested data
      cacheManager.set(key, responseData, ttl);
      setData(responseData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
}

/**
 * useCacheInvalidation Hook
 * Invalidates cache based on WebSocket events
 */
export function useCacheInvalidation() {
  // Invalidate cache on validation queue updates
  useRealtime('validation:queueUpdated', () => {
    cacheManager.invalidate('/validation-queue');
    cacheManager.invalidate('/survey-responses');
  });

  // Invalidate cache on survey response updates
  useRealtime('survey:responsesUpdated', () => {
    cacheManager.invalidate('/survey-responses');
    cacheManager.invalidate('/validation-queue');
  });

  // Invalidate cache on announcement updates
  useRealtime('announcement:created', () => {
    cacheManager.invalidate('/announcements');
  });

  // Invalidate cache on user activity
  useRealtime('user:activity', (data) => {
    if (data.type === 'update') {
      cacheManager.invalidate(`/users/${data.userId}`);
    }
  });
}

