import axios from 'axios';

// API Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 seconds - increased from 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create Axios instance
const api = axios.create(API_CONFIG);

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response) => {
    // Calculate request duration for debugging
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    
    console.log(`✅ API Call: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    
    return response;
  },
  (error) => {
    // Calculate request duration for debugging
    if (error.config?.metadata?.startTime) {
      const endTime = new Date();
      const duration = endTime - error.config.metadata.startTime;
      console.log(`❌ API Error: ${error.config.method?.toUpperCase()} ${error.config.url} (${duration}ms)`);
    }

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - let the component decide; do NOT clear token here to avoid unwanted logout cascades
          // We will surface requiresAuth flag in the rejection below
          break;
          
        case 403:
          // Forbidden - insufficient permissions
          console.warn('Insufficient permissions');
          break;
          
        case 404:
          // Not found
          console.warn('Resource not found');
          break;
          
        case 500:
          // Server error
          console.error('Server error');
          break;
          
        default:
          console.error(`HTTP Error ${status}:`, data?.message || 'Unknown error');
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
      console.error('Network Error:', error.message);
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        errors: [],
        isNetworkError: true
      });
    } else {
      // Request setup error
      console.error('Request Setup Error:', error.message);
      return Promise.reject({
        status: 0,
        message: 'Request failed. Please try again.',
        errors: [],
        isRequestError: true
      });
    }
  }
);

// API helper functions
export const apiHelpers = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Export the configured axios instance
export default api; 