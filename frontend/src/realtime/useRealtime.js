import React, { useEffect, useRef } from 'react';
import { getSocket, getConnectionStatus, onStatusChange } from './socket';
import logger from '../utils/logger.js';

/**
 * Enhanced useRealtime hook
 * Subscribe to WebSocket events with automatic cleanup
 */
export function useRealtime(event, handler) {
  const handlerRef = useRef(handler);

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !event) return;

    // Wrap handler to use latest version
    const wrappedHandler = (...args) => {
      if (handlerRef.current) {
        handlerRef.current(...args);
      }
    };

    s.on(event, wrappedHandler);

    return () => {
      try {
        s.off(event, wrappedHandler);
      } catch (error) {
        logger.error('Error removing event listener', error, { event });
      }
    };
  }, [event]);
}

/**
 * Hook for connection status
 */
export function useConnectionStatus() {
  const [status, setStatus] = React.useState(getConnectionStatus());
  
  useEffect(() => {
    const unsubscribe = onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}


