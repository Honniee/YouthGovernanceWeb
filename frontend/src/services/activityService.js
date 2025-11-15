import api from './api.js';
import logger from '../utils/logger.js';

/**
 * Activity Logs Service
 * Handles all API calls for activity logs and monitoring
 */
class ActivityService {
  /**
   * Get all activity logs with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.category - Category filter
   * @param {string} params.level - Level filter (info/warning/error/critical)
   * @param {string} params.userId - User ID filter
   * @param {string} params.resourceId - Resource ID filter
   * @param {string} params.search - Search query
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} API response with activity logs and pagination
   */
  async getActivityLogs(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.category) queryParams.append('category', params.category);
      if (params.level) queryParams.append('level', params.level);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.resourceId) queryParams.append('resourceId', params.resourceId);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/activity-logs?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load activity logs');
    }
  }

  /**
   * Get activity statistics for dashboard
   * @param {string} period - Time period (24h/7d/30d/90d)
   * @returns {Promise<Object>} API response with activity statistics
   */
  async getActivityStatistics(period = '30d') {
    try {
      const response = await api.get(`/activity-logs/statistics?period=${period}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load activity statistics');
    }
  }

  /**
   * Get recent activity (last 24 hours)
   * @param {number} limit - Number of recent activities to fetch
   * @returns {Promise<Object>} API response with recent activity logs
   */
  async getRecentActivity(limit = 10) {
    try {
      const response = await api.get(`/activity-logs/recent?limit=${limit}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load recent activity');
    }
  }

  /**
   * Get dashboard data (combines stats and recent)
   * @param {string} period - Time period for statistics
   * @returns {Promise<Object>} API response with dashboard data
   */
  async getDashboardData(period = '30d') {
    try {
      const response = await api.get(`/activity-logs/dashboard?period=${period}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load dashboard data');
    }
  }

  /**
   * Get user-specific activity logs
   * @param {string} userId - User ID
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} API response with user activity logs
   */
  async getUserActivityLogs(userId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.category) queryParams.append('category', params.category);
      if (params.level) queryParams.append('level', params.level);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/activity-logs/user/${userId}?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load user activity logs');
    }
  }

  /**
   * Get resource-specific activity logs
   * @param {string} type - Resource type
   * @param {string} id - Resource ID
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} API response with resource activity logs
   */
  async getResourceActivityLogs(type, id, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.category) queryParams.append('category', params.category);
      if (params.level) queryParams.append('level', params.level);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/activity-logs/resource/${type}/${id}?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load resource activity logs');
    }
  }

  /**
   * Export activity logs
   * @param {string} format - Export format (csv/json)
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} API response with exported data
   */
  async exportActivityLogs(format = 'json', filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.resourceId) queryParams.append('resourceId', filters.resourceId);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      const response = await api.get(`/activity-logs/export?${queryParams.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle file download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-logs-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Export completed successfully' };
      }

      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to export activity logs');
    }
  }

  /**
   * Cleanup old activity logs (admin only)
   * @param {number} daysOld - Delete logs older than this many days
   * @returns {Promise<Object>} API response with cleanup results
   */
  async cleanupOldActivityLogs(daysOld = 90) {
    try {
      const response = await api.delete('/activity-logs/cleanup', {
        data: { daysOld }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to cleanup old activity logs');
    }
  }

  /**
   * Get activity categories
   * @returns {Array} Available activity categories
   */
  getActivityCategories() {
    return [
      { value: 'User Management', label: 'User Management', color: 'blue' },
      { value: 'SK Management', label: 'SK Management', color: 'green' },
      { value: 'Term Management', label: 'Term Management', color: 'purple' },
      { value: 'Authentication', label: 'Authentication', color: 'yellow' },
      { value: 'Export Operations', label: 'Export Operations', color: 'indigo' },
      { value: 'Bulk Operations', label: 'Bulk Operations', color: 'pink' },
      { value: 'System Error', label: 'System Error', color: 'red' },
      { value: 'API Access', label: 'API Access', color: 'gray' }
    ];
  }

  /**
   * Get activity levels
   * @returns {Array} Available activity levels
   */
  getActivityLevels() {
    return [
      { value: 'info', label: 'Info', color: 'blue' },
      { value: 'warning', label: 'Warning', color: 'yellow' },
      { value: 'error', label: 'Error', color: 'red' },
      { value: 'critical', label: 'Critical', color: 'red' }
    ];
  }

  /**
   * Get level style classes
   * @param {string} level - Activity level
   * @returns {Object} Style classes for the level
   */
  getLevelStyle(level) {
    const styles = {
      info: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: 'text-blue-500'
      },
      warning: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: 'text-yellow-500'
      },
      error: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: 'text-red-500'
      },
      critical: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: 'text-red-600'
      }
    };

    return styles[level] || styles.info;
  }

  /**
   * Get category style classes
   * @param {string} category - Activity category
   * @returns {Object} Style classes for the category
   */
  getCategoryStyle(category) {
    const styles = {
      'User Management': {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200'
      },
      'SK Management': {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      'Term Management': {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200'
      },
      'Authentication': {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      },
      'Export Operations': {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200'
      },
      'Bulk Operations': {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        border: 'border-pink-200'
      },
      'System Error': {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      },
      'API Access': {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200'
      }
    };

    return styles[category] || styles['API Access'];
  }

  /**
   * Format activity description
   * @param {Object} activity - Activity log entry
   * @returns {string} Formatted description
   */
  formatActivityDescription(activity) {
    if (!activity) return 'Unknown activity';
    
    // Add user context if available
    let description = activity.description || activity.action || 'Activity performed';
    
    if (activity.userType && activity.userId) {
      const userTypeLabel = this.formatUserType(activity.userType);
      description = `[${userTypeLabel}] ${description}`;
    }
    
    return description;
  }

  /**
   * Format user type
   * @param {string} userType - User type
   * @returns {string} Formatted user type
   */
  formatUserType(userType) {
    const types = {
      'admin': 'Admin',
      'lydo_staff': 'LYDO Staff',
      'sk_official': 'SK Official',
      'youth': 'Youth',
      'SYSTEM': 'System'
    };

    return types[userType] || userType;
  }

  /**
   * Get relative time for activity
   * @param {string} timestamp - Activity timestamp
   * @returns {string} Relative time string
   */
  getRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return activityTime.toLocaleDateString();
    }
  }

  /**
   * Validate activity filters
   * @param {Object} filters - Filter parameters
   * @returns {Object} Validation result
   */
  validateActivityFilters(filters) {
    const errors = [];
    
    // Validate level
    if (filters.level) {
      const validLevels = this.getActivityLevels().map(l => l.value);
      if (!validLevels.includes(filters.level)) {
        errors.push('Invalid activity level');
      }
    }
    
    // Validate category
    if (filters.category) {
      const validCategories = this.getActivityCategories().map(c => c.value);
      if (!validCategories.includes(filters.category)) {
        errors.push('Invalid activity category');
      }
    }
    
    // Validate page and limit
    if (filters.page && (isNaN(filters.page) || filters.page < 1)) {
      errors.push('Page must be a positive number');
    }
    
    if (filters.limit && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'level', 'category', 'user_id', 'action'];
    if (filters.sortBy && !validSortFields.includes(filters.sortBy)) {
      errors.push('Invalid sort field');
    }
    
    const validSortOrders = ['asc', 'desc'];
    if (filters.sortOrder && !validSortOrders.includes(filters.sortOrder)) {
      errors.push('Invalid sort order');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  handleError(error, defaultMessage) {
    logger.error('Activity service error', error, { defaultMessage });
    
    let message = defaultMessage;
    let details = null;

    if (error.response) {
      const { data, status } = error.response;
      
      if (data && data.message) {
        message = data.message;
      }
      
      if (data && data.errors) {
        details = data.errors;
      }

      switch (status) {
        case 400:
          message = message || 'Invalid request data';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to access activity logs.';
          break;
        case 404:
          message = 'Activity logs not found.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = message || 'An unexpected error occurred.';
      }
    } else if (error.request) {
      message = 'Network error. Please check your connection.';
    } else {
      message = error.message || defaultMessage;
    }

    return {
      success: false,
      message,
      details,
      status: error.response?.status || 0
    };
  }
}

// Create singleton instance
const activityService = new ActivityService();
export default activityService;


























