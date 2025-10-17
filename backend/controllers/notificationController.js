import { query } from '../config/database.js';
import { validatePagination, sanitizeInput } from '../utils/validation.js';

/**
 * Get user notifications with pagination
 */
export const getUserNotifications = async (req, res) => {
  try {
    const lydoId = req.user?.id;
    if (!lydoId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the User ID from Users table using LYDO ID
    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );

    // Allow users without a Users mapping (e.g., SK officials)
    // We'll still return general notifications via user_type
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    // Get query parameters
    const rawQuery = req.query || {};
    const cleanQuery = sanitizeInput(rawQuery);
    
    const unreadOnly = cleanQuery.unreadOnly === 'true';
    const type = cleanQuery.type || null;

    // Validate and get pagination parameters - allow higher limit for notifications
    const { page, limit, offset } = validatePagination(cleanQuery, 10000);
    
    // Normalize/alias user types for broader compatibility with existing data
    const tokenUserType = req.user?.userType || 'admin';
    const userTypeAliases = tokenUserType === 'sk_official'
      ? ['sk_official', 'sk']
      : tokenUserType === 'lydo_staff'
        ? ['lydo_staff', 'staff']
        : [tokenUserType];

    // Build query - allow general notifications targeted by any alias
    let whereClause = 'WHERE ((user_id = $1) OR (user_id IS NULL AND user_type = ANY($2)))';
    let queryParams = [userId, userTypeAliases];
    let paramCount = 2;

    // Add filters
    if (unreadOnly) {
      paramCount++;
      whereClause += ` AND is_read = false`;
    }

    if (type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    // Get notifications
    const notificationsQuery = `
      SELECT 
        notification_id,
        user_id,
        user_type,
        title,
        message,
        type,
        priority,
        is_read,
        read_at,
        expires_at,
        created_at AT TIME ZONE 'UTC' AS created_at
      FROM "Notifications" 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);

    const notificationsResult = await query(notificationsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM "Notifications" 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Format notifications
    const notifications = notificationsResult.rows.map(notification => ({
      id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      isRead: notification.is_read,
      readAt: notification.read_at,
      expiresAt: notification.expires_at,
      createdAt: notification.created_at,
      timeAgo: getTimeAgo(notification.created_at)
    }));

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('getUserNotifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const lydoId = req.user?.id;
    if (!lydoId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the User ID from Users table using LYDO ID
    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );

    // Allow no Users mapping; unread count will still include general notifications
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    // Normalize/alias user types for unread count as well
    const tokenUserType2 = req.user?.userType || 'admin';
    const userTypeAliases2 = tokenUserType2 === 'sk_official'
      ? ['sk_official', 'sk']
      : tokenUserType2 === 'lydo_staff'
        ? ['lydo_staff', 'staff']
        : [tokenUserType2];

    const countQuery = `
      SELECT COUNT(*) as count 
      FROM "Notifications" 
      WHERE (user_id = $1 OR (user_id IS NULL AND user_type = ANY($2)))
        AND is_read = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;

    const result = await query(countQuery, [userId, userTypeAliases2]);
    const unreadCount = parseInt(result.rows[0].count);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const lydoId = req.user?.id;
    const notificationId = req.params.notificationId;

    if (!lydoId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the User ID from Users table using LYDO ID
    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );

    // Allow no Users mapping; can still mark general notifications as read
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    // Update notification
    const updateQuery = `
      UPDATE "Notifications" 
      SET is_read = true, read_at = CURRENT_TIMESTAMP 
      WHERE notification_id = $1 
        AND (user_id = $2 OR (user_id IS NULL AND user_type = ANY($3)))
      RETURNING notification_id
    `;

    const tokenUserType3 = req.user?.userType || 'admin';
    const userTypeAliases3 = tokenUserType3 === 'sk_official'
      ? ['sk_official', 'sk']
      : tokenUserType3 === 'lydo_staff'
        ? ['lydo_staff', 'staff']
        : [tokenUserType3];

    const result = await query(updateQuery, [notificationId, userId, userTypeAliases3]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const lydoId = req.user?.id;
    if (!lydoId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the User ID from Users table using LYDO ID
    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );

    // Allow no Users mapping; can still mark general notifications as read
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    // Update all unread notifications
    const updateQuery = `
      UPDATE "Notifications" 
      SET is_read = true, read_at = CURRENT_TIMESTAMP 
      WHERE (user_id = $1 OR (user_id IS NULL AND user_type = ANY($2)))
        AND is_read = false
    `;

    const tokenUserType4 = req.user?.userType || 'admin';
    const userTypeAliases4 = tokenUserType4 === 'sk_official'
      ? ['sk_official', 'sk']
      : tokenUserType4 === 'lydo_staff'
        ? ['lydo_staff', 'staff']
        : [tokenUserType4];

    const result = await query(updateQuery, [userId, userTypeAliases4]);
    
    // Get count of affected rows for logging
    console.log(`✅ Marked ${result.rowCount || 0} notifications as read`);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const lydoId = req.user?.id;
    const notificationId = req.params.notificationId;

    if (!lydoId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the User ID from Users table using LYDO ID
    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );

    // Allow no Users mapping; can still delete general notifications
    const userId = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    // Delete notification (only if user owns it or it's a general notification for their user type)
    const deleteQuery = `
      DELETE FROM "Notifications" 
      WHERE notification_id = $1 
        AND (user_id = $2 OR (user_id IS NULL AND user_type = ANY($3)))
      RETURNING notification_id
    `;

    const tokenUserType5 = req.user?.userType || 'admin';
    const userTypeAliases5 = tokenUserType5 === 'sk_official'
      ? ['sk_official', 'sk']
      : tokenUserType5 === 'lydo_staff'
        ? ['lydo_staff', 'staff']
        : [tokenUserType5];

    const result = await query(deleteQuery, [notificationId, userId, userTypeAliases5]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(timestamp) {
  // Get current time in UTC
  const now = new Date();
  
  // PostgreSQL timestamp comes as UTC, so parse it directly
  const notificationTime = new Date(timestamp);
  
  // Calculate difference in milliseconds
  const diffMs = now.getTime() - notificationTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Debug logging
  console.log(`⏰ Time calculation:
    - DB timestamp: ${timestamp}
    - Notification time (parsed): ${notificationTime.toISOString()}
    - Now: ${now.toISOString()}
    - Diff (ms): ${diffMs}
    - Diff (mins): ${diffMins}
    - Diff (hours): ${diffHours}`);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return notificationTime.toLocaleDateString();
}
