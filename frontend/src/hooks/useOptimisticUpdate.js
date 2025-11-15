import { useState, useCallback } from 'react';

/**
 * useOptimisticUpdate Hook
 * Provides optimistic updates for better UX
 */
export function useOptimisticUpdate(initialData, updateFn) {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (optimisticData, actualData) => {
    // Optimistically update UI
    setData(optimisticData);
    setIsUpdating(true);
    setError(null);

    try {
      // Perform actual update
      const result = await updateFn(actualData);
      
      // Update with server response
      if (result) {
        setData(result);
      }
      
      return result;
    } catch (err) {
      // Revert to previous data on error
      setData(initialData);
      setError(err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [updateFn, initialData]);

  const rollback = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsUpdating(false);
  }, [initialData]);

  return {
    data,
    update,
    rollback,
    isUpdating,
    error
  };
}

/**
 * useOptimisticMutation Hook
 * Optimistic mutation hook for API calls
 */
export function useOptimisticMutation(mutationFn, options = {}) {
  const { onSuccess, onError, onSettled } = options;
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (variables, optimisticUpdate) => {
    setIsMutating(true);
    setError(null);

    try {
      // Apply optimistic update if provided
      if (optimisticUpdate) {
        optimisticUpdate();
      }

      // Perform mutation
      const result = await mutationFn(variables);

      // Call success callback
      if (onSuccess) {
        onSuccess(result, variables);
      }

      return result;
    } catch (err) {
      setError(err);
      
      // Call error callback
      if (onError) {
        onError(err, variables);
      }
      
      throw err;
    } finally {
      setIsMutating(false);
      
      // Call settled callback
      if (onSettled) {
        onSettled(error, variables);
      }
    }
  }, [mutationFn, onSuccess, onError, onSettled, error]);

  return {
    mutate,
    isMutating,
    error
  };
}


