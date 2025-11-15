import api, { apiHelpers } from './api';
import logger from '../utils/logger.js';

/**
 * Notification Service
 * Handles all notification-related API calls
 */
class NotificationService {
  /**
   * Get user notifications with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10)
   * @param {boolean} options.unreadOnly - Only unread notifications
   * @param {string} options.type - Filter by notification type
   * @returns {Promise<Object>} API response with notifications and pagination
   */
  async getNotifications(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.type) params.append('type', options.type);

      const response = await api.get(`/notifications?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching notifications', error, { options });
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get unread notification count
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data.data.unreadCount;
    } catch (error) {
      logger.error('Error fetching unread count', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} API response
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      logger.error('Error marking notification as read', error, { notificationId });
      throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} API response
   */
  async markAllAsRead() {
    try {
      logger.debug('Making markAllAsRead API call');
      const response = await apiHelpers.patch('/notifications/mark-all-read');
      logger.debug('markAllAsRead response received', { success: response?.success });
      return response;
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
      throw error; // Re-throw the error to preserve the full error object
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} API response
   */
  async deleteNotification(notificationId) {
    try {
      logger.debug('Making deleteNotification API call', { notificationId });
      const response = await api.delete(`/notifications/${notificationId}`);
      logger.debug('deleteNotification response received', { success: response?.data?.success });
      return response.data;
    } catch (error) {
      logger.error('Error deleting notification', error, { notificationId });
      throw new Error(error.response?.data?.message || 'Failed to delete notification');
    }
  }

  /**
   * Get notification type icon and color
   * @param {string} type - Notification type
   * @returns {Object} Icon component and color classes
   */
  getNotificationStyle(type) {
    const styles = {
      info: {
        iconClass: 'bg-blue-500',
        bgClass: 'bg-blue-50/30 dark:bg-blue-900/20',
        textClass: 'text-blue-600 dark:text-blue-400'
      },
      success: {
        iconClass: 'bg-green-500',
        bgClass: 'bg-green-50/30 dark:bg-green-900/20',
        textClass: 'text-green-600 dark:text-green-400'
      },
      warning: {
        iconClass: 'bg-orange-500',
        bgClass: 'bg-orange-50/30 dark:bg-orange-900/20',
        textClass: 'text-orange-600 dark:text-orange-400'
      },
      error: {
        iconClass: 'bg-red-500',
        bgClass: 'bg-red-50/30 dark:bg-red-900/20',
        textClass: 'text-red-600 dark:text-red-400'
      },
      announcement: {
        iconClass: 'bg-purple-500',
        bgClass: 'bg-purple-50/30 dark:bg-purple-900/20',
        textClass: 'text-purple-600 dark:text-purple-400'
      },
      survey_reminder: {
        iconClass: 'bg-indigo-500',
        bgClass: 'bg-indigo-50/30 dark:bg-indigo-900/20',
        textClass: 'text-indigo-600 dark:text-indigo-400'
      },
      validation_needed: {
        iconClass: 'bg-yellow-500',
        bgClass: 'bg-yellow-50/30 dark:bg-yellow-900/20',
        textClass: 'text-yellow-600 dark:text-yellow-400'
      },
      sk_term_end: {
        iconClass: 'bg-red-500',
        bgClass: 'bg-red-50/30 dark:bg-red-900/20',
        textClass: 'text-red-600 dark:text-red-400'
      },
      kk_batch_end: {
        iconClass: 'bg-orange-500',
        bgClass: 'bg-orange-50/30 dark:bg-orange-900/20',
        textClass: 'text-orange-600 dark:text-orange-400'
      }
    };

    return styles[type] || styles.info;
  }

  /**
   * Get priority badge style
   * @param {string} priority - Notification priority
   * @returns {Object} Style classes for priority badge
   */
  getPriorityStyle(priority) {
    const styles = {
      low: {
        badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        label: 'Low'
      },
      normal: {
        badgeClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        label: 'Normal'
      },
      high: {
        badgeClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        label: 'High'
      },
      urgent: {
        badgeClass: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        label: 'Urgent'
      }
    };

    return styles[priority] || styles.normal;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;




























