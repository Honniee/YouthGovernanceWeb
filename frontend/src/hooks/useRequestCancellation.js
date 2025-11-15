import { useEffect, useRef } from 'react';
import { AbortController } from 'abort-controller';

/**
 * useRequestCancellation Hook
 * Automatically cancels requests when component unmounts
 */
export function useRequestCancellation() {
  const abortControllerRef = useRef(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getSignal = () => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current.signal;
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
  };

  return { getSignal, cancel };
}

/**
 * useAbortController Hook
 * Creates an abort controller that cancels on unmount
 */
export function useAbortController() {
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  return abortControllerRef.current;
}


