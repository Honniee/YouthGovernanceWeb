import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '../realtime/useRealtime';
import { useRealtimeContext } from '../realtime/RealtimeProvider';
import logger from '../utils/logger.js';

/**
 * useNotifications Hook
 * Manages real-time notifications via WebSocket
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket, isConnected } = useRealtimeContext();

  // Listen for new notifications
  useRealtime('notification:new', useCallback((data) => {
    logger.debug('New notification received', { notificationId: data.id, type: data.type });
    const notification = {
      id: data.id || Date.now().toString(),
      type: data.type || 'info',
      title: data.title || 'Notification',
      message: data.message || '',
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      ...data
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []));

  // Listen for validation queue updates
  useRealtime('validation:queueUpdated', useCallback((data) => {
    logger.debug('Validation queue updated', { queueId: data.queueId, type: data.type });
    const notification = {
      id: `validation-${data.queueId || Date.now()}`,
      type: data.type === 'validated' ? 'success' : 'warning',
      title: 'Validation Queue Update',
      message: data.type === 'validated' 
        ? `Item ${data.queueId} has been validated`
        : `Item ${data.queueId} has been rejected`,
      timestamp: data.at || new Date().toISOString(),
      read: false,
      data
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []));

  // Listen for survey response updates
  useRealtime('survey:responsesUpdated', useCallback((data) => {
    logger.debug('Survey responses updated', { responseId: data.responseId });
    const notification = {
      id: `survey-${data.responseId || Date.now()}`,
      type: 'info',
      title: 'Survey Response Update',
      message: `New survey response update`,
      timestamp: data.at || new Date().toISOString(),
      read: false,
      data
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []));

  // Listen for announcement updates
  useRealtime('announcement:created', useCallback((data) => {
    logger.debug('New announcement', { announcementId: data.id, title: data.title });
    const notification = {
      id: `announcement-${data.id || Date.now()}`,
      type: 'info',
      title: 'New Announcement',
      message: data.title || 'A new announcement has been posted',
      timestamp: data.created_at || new Date().toISOString(),
      read: false,
      data
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []));

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}


