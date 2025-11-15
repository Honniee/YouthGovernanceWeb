/**
 * Frontend Logger Utility
 * Professional logging solution for production applications
 * 
 * Features:
 * - Environment-aware (dev vs production)
 * - Log levels (debug, info, warn, error)
 * - Sends critical errors to backend in production
 * - No console spam in production
 * - Structured logging with context
 */

import api from '../services/api';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be adjusted via env)
const CURRENT_LOG_LEVEL = isDevelopment 
  ? LOG_LEVELS.DEBUG 
  : LOG_LEVELS.ERROR; // Only errors in production

// Track if we're currently sending an error to backend (prevent infinite loops)
let isSendingError = false;

/**
 * Send error to backend for monitoring (production only)
 */
const sendErrorToBackend = async (level, message, context = {}) => {
  // Only send errors in production, and only actual errors
  if (!isProduction || level !== 'error' || isSendingError) {
    return;
  }

  try {
    isSendingError = true;
    
    const errorData = {
      level,
      message,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('userId') || 'anonymous',
        userType: localStorage.getItem('userType') || 'anonymous'
      }
    };

    // Send to backend (non-blocking, don't wait for response)
    api.post('/system/errors', errorData, {
      timeout: 3000
    }).catch(() => {
      // Silently fail - don't log errors about logging errors
    });
  } catch (error) {
    // Silently fail - error logging shouldn't break the app
  } finally {
    // Reset flag after a delay to allow retries
    setTimeout(() => {
      isSendingError = false;
    }, 1000);
  }
};

/**
 * Format log message with context
 */
const formatMessage = (message, context = {}) => {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  
  try {
    return `${message} ${JSON.stringify(context)}`;
  } catch (error) {
    return `${message} [Context serialization failed]`;
  }
};

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      if (isDevelopment) {
        console.debug(`[DEBUG] ${message}`, context);
      }
    }
  },

  /**
   * Info logs - development only
   */
  info: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      if (isDevelopment) {
        console.info(`[INFO] ${message}`, context);
      }
    }
  },

  /**
   * Warning logs - development only (errors sent to backend)
   */
  warn: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      if (isDevelopment) {
        console.warn(`[WARN] ${message}`, context);
      }
      // In production, warnings are silently ignored (or can be sent to backend if needed)
    }
  },

  /**
   * Error logs - always logged, sent to backend in production
   */
  error: (message, error = null, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      const errorContext = {
        ...context,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null
      };

      if (isDevelopment) {
        console.error(`[ERROR] ${message}`, errorContext);
        if (error) {
          console.error('Error object:', error);
        }
      }

      // Send critical errors to backend in production
      if (isProduction) {
        sendErrorToBackend('error', message, errorContext);
      }
    }
  },

  /**
   * Log API calls (development only)
   */
  api: (method, url, duration, status = null) => {
    if (isDevelopment && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '📡';
      console.log(`${statusIcon} API: ${method} ${url} (${duration}ms)`);
    }
  },

  /**
   * Log WebSocket events (development only)
   */
  socket: (event, data = null) => {
    if (isDevelopment && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`📡 WebSocket: ${event}`, data || '');
    }
  },

  /**
   * Log component lifecycle events (development only)
   */
  component: (componentName, event, props = {}) => {
    if (isDevelopment && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(`[${componentName}] ${event}`, props);
    }
  }
};

export default logger;

