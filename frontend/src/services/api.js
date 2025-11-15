import axios from 'axios';
import cacheManager from './cache.js';
import logger from '../utils/logger.js';

// API Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 120000, // 120 seconds (2 minutes) - for clustering large datasets
  headers: {
    'Content-Type': 'application/json',
  },
  // SECURITY: Enable credentials to send httpOnly cookies with requests
  withCredentials: true, // Required for httpOnly cookies to be sent
};

// Create Axios instance
const api = axios.create(API_CONFIG);

// Cache configuration
const CACHE_ENABLED = true;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default
const CACHEABLE_METHODS = ['get'];
const CACHE_INVALIDATION_PATTERNS = {
  post: (url) => {
    // Invalidate related caches on POST
    if (url.includes('/validation-queue')) {
      cacheManager.invalidate('/validation-queue');
      cacheManager.invalidate('/survey-responses');
    } else if (url.includes('/announcements')) {
      cacheManager.invalidate('/announcements');
    } else if (url.includes('/survey-responses')) {
      cacheManager.invalidate('/survey-responses');
      cacheManager.invalidate('/validation-queue');
    }
  },
  put: (url) => {
    cacheManager.invalidate(url.split('?')[0]);
  },
  patch: (url) => {
    cacheManager.invalidate(url.split('?')[0]);
  },
  delete: (url) => {
    cacheManager.invalidate(url.split('?')[0]);
  }
};

// Track active requests for cancellation
const activeRequests = new Map();

// CSRF token cache to avoid reading from cookie on every request
let csrfTokenCache = null;
let csrfTokenPromise = null;

// Helper function to get CSRF token from cookie
// NOTE: In cross-origin scenarios (production), cookies might not be readable via JavaScript
// due to sameSite: 'none' restrictions. We rely on server response headers/body instead.
const getCSRFTokenFromCookie = () => {
  try {
    // Only try to read cookie in same-origin scenarios (development)
    // In production (cross-origin), cookies are sent automatically but not readable
    if (import.meta.env.PROD) {
      // In production, we can't reliably read cross-origin cookies
      return null;
    }
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; XSRF-TOKEN=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
  } catch (error) {
    logger.debug('Cannot read CSRF token from cookie (expected in cross-origin)', error);
  }
  return null;
};

// Function to fetch CSRF token from server
const fetchCSRFToken = async () => {
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  
  csrfTokenPromise = api.get('/csrf-token', { skipCache: true })
    .then(response => {
      // In cross-origin scenarios, we can't read cookies via JavaScript
      // So we MUST get the token from the response header or body
      // Priority: response header > response body (cookie not readable in cross-origin)
      const token = response.headers['x-csrf-token'] || 
                    response.headers['X-CSRF-Token'] ||
                    response.data?.csrfToken;
      
      if (!token) {
        logger.warn('CSRF token not found in response header or body', {
          hasHeader: !!response.headers['x-csrf-token'],
          hasBody: !!response.data?.csrfToken
        });
      } else {
        csrfTokenCache = token;
        logger.debug('CSRF token fetched and cached', { 
          hasToken: !!token,
          source: response.headers['x-csrf-token'] ? 'header' : 'body',
          tokenLength: token?.length 
        });
      }
      
      csrfTokenPromise = null;
      return token || null;
    })
    .catch(error => {
      logger.error('Failed to fetch CSRF token', error);
      csrfTokenPromise = null;
      return null;
    });
  
  return csrfTokenPromise;
};

// Request interceptor - Add CSRF token and setup cancellation
// SECURITY: Tokens are now in httpOnly cookies (sent automatically), no need to add to headers
api.interceptors.request.use(
  async (config) => {
    // SECURITY: Tokens are in httpOnly cookies, sent automatically by browser
    // No need to manually add Authorization header anymore
    // (Keeping backward compatibility: if token in localStorage, still send it)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // SECURITY: Add CSRF token for state-changing requests
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase());
    
    if (isStateChanging) {
      // In cross-origin scenarios, we can't read cookies via JavaScript
      // So we MUST use the cached token from a previous fetch or fetch it now
      let csrfToken = csrfTokenCache;
      
      // If not in cache, try to read from cookie (only works in same-origin/dev)
      if (!csrfToken) {
        csrfToken = getCSRFTokenFromCookie();
        if (csrfToken) {
          csrfTokenCache = csrfToken;
        }
      }
      
      // If still not available, fetch it from server (this will wait if already fetching)
      // This is critical in cross-origin scenarios where cookies aren't readable
      if (!csrfToken) {
        try {
          csrfToken = await fetchCSRFToken();
          if (!csrfToken) {
            logger.error('Failed to get CSRF token for state-changing request', { 
              url: config.url, 
              method: config.method 
            });
          }
        } catch (error) {
          logger.error('Failed to fetch CSRF token for request', { 
            url: config.url, 
            method: config.method, 
            error: error.message 
          });
        }
      }
      
      // Add CSRF token to header if available
      // Use both header names for compatibility
      if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
        config.headers['X-XSRF-Token'] = csrfToken; // Also set X-XSRF-Token for compatibility
        logger.debug('CSRF token added to request', { 
          url: config.url, 
          method: config.method,
          hasToken: !!csrfToken,
          tokenLength: csrfToken?.length 
        });
      } else {
        logger.error('CSRF token not available for state-changing request - request will likely fail', { 
          url: config.url, 
          method: config.method 
        });
      }
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    // Store cache key in config for later use (for GET requests)
    if (CACHE_ENABLED && config.method?.toLowerCase() === 'get' && !config.skipCache) {
      config.cacheKey = cacheManager.generateKey(config.url, config.params);
    }
    
    // Setup request cancellation if signal is provided
    if (config.signal) {
      const requestId = `${config.method}-${config.url}-${Date.now()}`;
      config.requestId = requestId;
      
      // Clean up on abort
      config.signal.addEventListener('abort', () => {
        activeRequests.delete(requestId);
      });
      
      activeRequests.set(requestId, config);
    }
    
    return config;
  },
  (error) => {
    logger.error('Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses, errors, and cache management
api.interceptors.response.use(
  (response) => {
    // Clean up active request tracking
    if (response.config.requestId) {
      activeRequests.delete(response.config.requestId);
    }
    
    // Update CSRF token cache if token is received in response
    // Priority: response header > response body (cookie not reliable in cross-origin)
    const csrfTokenFromHeader = response.headers['x-csrf-token'] || response.headers['X-CSRF-Token'];
    const csrfTokenFromBody = response.data?.csrfToken;
    
    // Use the most recent token available (prefer header over body)
    const newToken = csrfTokenFromHeader || csrfTokenFromBody;
    if (newToken) {
      // Always update cache if we have a new token (even if same, to ensure freshness)
      if (newToken !== csrfTokenCache) {
        csrfTokenCache = newToken;
        logger.debug('CSRF token cache updated from response', { 
          source: csrfTokenFromHeader ? 'header' : 'body',
          hasToken: !!newToken,
          tokenLength: newToken?.length
        });
      } else {
        // Token is same, but ensure cache is set
        csrfTokenCache = newToken;
      }
    }
    
    // Calculate request duration for debugging
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    
    const method = response.config.method?.toUpperCase();
    const url = response.config.url;
    
    // Log API calls in development only
    logger.api(method, url, duration, 'success');
    
    // Cache GET responses
    // Cache the full response.data object to preserve structure (success, data, pagination, etc.)
    if (CACHE_ENABLED && method === 'GET' && !response.config.skipCache && response.config.cacheKey) {
      const ttl = response.config.cacheTTL || CACHE_TTL;
      const dataToCache = response.data; // Cache full response object, not just nested data
      cacheManager.set(response.config.cacheKey, dataToCache, ttl);
    }
    
    // Invalidate cache on mutations
    if (CACHE_ENABLED && method !== 'GET') {
      const methodLower = method.toLowerCase();
      if (CACHE_INVALIDATION_PATTERNS[methodLower]) {
        CACHE_INVALIDATION_PATTERNS[methodLower](url);
      }
    }
    
    return response;
  },
  (error) => {
    // Clean up active request tracking
    if (error.config?.requestId) {
      activeRequests.delete(error.config.requestId);
    }
    
    // Don't log errors for cancelled requests
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }
    
    // Calculate request duration for debugging
    let duration = 0;
    if (error.config?.metadata?.startTime) {
      const endTime = new Date();
      duration = endTime - error.config.metadata.startTime;
      logger.api(error.config.method?.toUpperCase(), error.config.url, duration, 'error');
    }

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - try to refresh token if refresh token exists
          // SECURITY: Tokens are in httpOnly cookies, try to refresh access token
          // Note: Token refresh handled asynchronously, component will handle 401
          break;
          
        case 403:
          // Forbidden - insufficient permissions or CSRF error
          if (error.response?.data?.message?.includes('CSRF')) {
            logger.warn('CSRF token error', { url: error.config?.url, status, message: error.response?.data?.message });
            // Clear CSRF token cache and try to fetch new token
            csrfTokenCache = null;
            csrfTokenPromise = null;
            
            // Also clear the cookie token by trying to read it fresh
            const freshCookieToken = getCSRFTokenFromCookie();
            if (freshCookieToken) {
              csrfTokenCache = freshCookieToken;
              logger.debug('Updated CSRF cache from fresh cookie', { hasToken: !!freshCookieToken });
            }
            
            // Try to fetch new CSRF token (non-blocking)
            fetchCSRFToken()
              .then((newToken) => {
                if (newToken) {
                  logger.info('CSRF token refreshed after error', { hasToken: !!newToken });
                } else {
                  logger.warn('CSRF token refresh returned no token');
                }
              })
              .catch((fetchError) => {
                logger.error('Failed to refresh CSRF token', fetchError);
              });
          } else {
            logger.warn('Insufficient permissions', { url: error.config?.url, status });
          }
          break;
          
        case 404:
          // Not found
          logger.warn('Resource not found', { url: error.config?.url, status });
          break;
          
        case 500:
          // Server error
          logger.error('Server error', error, { url: error.config?.url, status, response: data });
          break;
          
        default:
          logger.error(`HTTP Error ${status}`, error, { url: error.config?.url, status, message: data?.message });
      }
      
      // Return formatted error
      return Promise.reject({
        status,
        message: data?.message || `HTTP Error ${status}`,
        errors: data?.errors || [],
        data: data,
        requiresAuth: status === 401
      });
    } else if (error.request) {
      // Network error
      logger.error('Network Error', error, { url: error.config?.url });
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        errors: [],
        isNetworkError: true
      });
    } else {
      // Request setup error
      logger.error('Request Setup Error', error, { url: error.config?.url });
      return Promise.reject({
        status: 0,
        message: 'Request failed. Please try again.',
        errors: [],
        isRequestError: true
      });
    }
  }
);

// API helper functions with caching support
export const apiHelpers = {
  // GET request (with caching)
  get: async (url, config = {}) => {
    try {
      // Check cache first if caching is enabled and not skipped
      if (CACHE_ENABLED && !config.skipCache) {
        const cacheKey = cacheManager.generateKey(url, config.params);
        const cached = cacheManager.get(cacheKey);
        
        if (cached) {
          // Log cache hits in development only
          logger.debug(`Cache hit: GET ${url}`, { url });
          return cached;
        }
      }
      
      // Make API request
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request (invalidates cache)
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request (invalidates cache)
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request (invalidates cache)
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request (invalidates cache)
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Clear cache for specific URL pattern
  clearCache: (pattern) => {
    return cacheManager.invalidate(pattern);
  },

  // Clear all cache
  clearAllCache: () => {
    cacheManager.clear();
  },

  // Cancel all active requests
  cancelAllRequests: () => {
    activeRequests.forEach((config, requestId) => {
      if (config.signal && !config.signal.aborted) {
        config.signal.abort();
      }
      activeRequests.delete(requestId);
    });
  },

  // Cancel requests matching a pattern
  cancelRequests: (pattern) => {
    activeRequests.forEach((config, requestId) => {
      if (config.url.includes(pattern) && config.signal && !config.signal.aborted) {
        config.signal.abort();
        activeRequests.delete(requestId);
      }
    });
  }
};

// Export the configured axios instance
export default api; 