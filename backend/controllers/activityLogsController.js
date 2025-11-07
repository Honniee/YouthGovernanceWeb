import activityLogService from '../services/activityLogService.js';
import { query } from '../config/database.js';

/**
 * Activity Logs Controller
 * Handles activity log viewing and management
 */

/**
 * Get activity logs with filtering and pagination
 * GET /api/activity-logs
 */
const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      action = '',
      resource = '',
      userType = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (validatedPage - 1) * validatedLimit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      whereConditions.push(`action = $${paramCount}`);
      queryParams.push(action);
    }

    if (resource) {
      paramCount++;
      whereConditions.push(`resource_type = $${paramCount}`);
      queryParams.push(resource);
    }

    if (userType) {
      paramCount++;
      whereConditions.push(`user_type = $${paramCount}`);
      queryParams.push(userType);
    }

    if (dateFrom) {
      paramCount++;
      whereConditions.push(`created_at >= $${paramCount}::date`);
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      whereConditions.push(`created_at <= $${paramCount}::date + INTERVAL '1 day'`);
      queryParams.push(dateTo);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(resource_name ILIKE $${paramCount} OR details::text ILIKE $${paramCount} OR user_id ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Activity_Logs" ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Main query - Convert timestamp to Asia/Manila timezone
    const logsQuery = `
      SELECT 
        log_id,
        user_id,
        user_type,
        action,
        resource_type,
        resource_id,
        resource_name,
        details,
        category,
        success,
        error_message,
        message,
        -- Return timestamp as-is, handle timezone in JavaScript
        created_at
      FROM "Activity_Logs"
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(validatedLimit, offset);
    const result = await query(logsQuery, queryParams);

    const totalPages = Math.ceil(total / validatedLimit);

    // Format timestamps: Timestamps are stored in Asia/Manila timezone
    // Convert PostgreSQL format to ISO string with timezone
    const formattedItems = result.rows.map(log => {
      let timestamp = log.created_at;
      if (timestamp) {
        try {
          const timestampStr = String(timestamp).trim();
          // Parse PostgreSQL TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
          const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
          if (match) {
            // Convert to ISO format with Asia/Manila timezone: "YYYY-MM-DDTHH:MM:SS+08:00"
            const [, year, month, day, hour, minute, second, millisecond] = match;
            timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}${millisecond || ''}+08:00`;
          } else {
            // Try parsing as Date if already in different format
            const date = new Date(timestampStr);
            if (!isNaN(date.getTime())) {
              timestamp = date.toISOString();
            } else {
              timestamp = null;
            }
          }
        } catch (error) {
          console.error('Error formatting timestamp:', error, timestamp);
          timestamp = null;
        }
      }
      
      return {
        logId: log.log_id,
        userId: log.user_id,
        userType: log.user_type,
        action: log.action,
        resource: log.resource_type,
        resourceId: log.resource_id,
        details: log.resource_name || log.details,
        timestamp: timestamp,
        status: log.success ? 'success' : 'failed',
        ipAddress: null, // Not stored in current schema
        userAgent: null // Not stored in current schema
      };
    });

    res.json({
      success: true,
      data: {
        items: formattedItems,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

/**
 * Get activity log statistics
 * GET /api/activity-logs/statistics
 */
const getActivityStatistics = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      userType
    } = req.query;

    const options = {
      startDate,
      endDate,
      userId,
      userType
    };

    const statistics = await activityLogService.getStatistics(options);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
};

/**
 * Get activity logs for a specific user
 * GET /api/activity-logs/user/:userId
 */
const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      category,
      action,
      level,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Check if user can access these logs
    const canAccess = req.user.role === 'admin' || req.user.id === userId;
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own activity logs.'
      });
    }

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const options = {
      page: validatedPage,
      limit: validatedLimit,
      userId,
      category,
      action,
      level,
      startDate,
      endDate,
      sortBy,
      sortOrder
    };

    const result = await activityLogService.getLogs(options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity logs',
      error: error.message
    });
  }
};

/**
 * Get activity logs for a specific resource
 * GET /api/activity-logs/resource/:resourceType/:resourceId
 */
const getResourceActivityLogs = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      level,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const options = {
      page: validatedPage,
      limit: validatedLimit,
      userId,
      action,
      level,
      startDate,
      endDate,
      affectedResourceType: resourceType,
      affectedResourceId: resourceId,
      sortBy,
      sortOrder
    };

    const result = await activityLogService.getLogs(options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching resource activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource activity logs',
      error: error.message
    });
  }
};

/**
 * Get recent activity logs (last 24 hours)
 * GET /api/activity-logs/recent
 */
const getRecentActivityLogs = async (req, res) => {
  try {
    const {
      limit = 20,
      level,
      category
    } = req.query;

    const validatedLimit = Math.min(50, Math.max(1, parseInt(limit)));
    
    // Get logs from last 24 hours
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    const options = {
      page: 1,
      limit: validatedLimit,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      level,
      category,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };

    const result = await activityLogService.getLogs(options);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        totalCount: result.pagination.totalRecords
      }
    });

  } catch (error) {
    console.error('Error fetching recent activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity logs',
      error: error.message
    });
  }
};

/**
 * Get activity logs dashboard data
 * GET /api/activity-logs/dashboard
 */
const getActivityDashboard = async (req, res) => {
  try {
    const {
      period = '7d' // 24h, 7d, 30d, 90d
    } = req.query;

    // Calculate date range based on period
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get statistics for the period
    const statistics = await activityLogService.getStatistics({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Get recent critical/error logs
    const criticalLogs = await activityLogService.getLogs({
      page: 1,
      limit: 10,
      level: 'critical',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    const errorLogs = await activityLogService.getLogs({
      page: 1,
      limit: 10,
      level: 'error',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    // Get top active users
    const topUsers = await getTopActiveUsers(startDate, endDate);

    res.json({
      success: true,
      data: {
        period,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        statistics,
        criticalLogs: criticalLogs.logs,
        errorLogs: errorLogs.logs,
        topUsers
      }
    });

  } catch (error) {
    console.error('Error fetching activity dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity dashboard',
      error: error.message
    });
  }
};

/**
 * Export activity logs
 * GET /api/activity-logs/export
 */
const exportActivityLogs = async (req, res) => {
  try {
    const {
      format = 'csv', // csv, json
      userId,
      userType,
      category,
      action,
      level,
      startDate,
      endDate,
      limit = 1000
    } = req.query;

    const validatedLimit = Math.min(10000, Math.max(1, parseInt(limit))); // Max 10k records

    const options = {
      page: 1,
      limit: validatedLimit,
      userId,
      userType,
      category,
      action,
      level,
      startDate,
      endDate,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };

    const result = await activityLogService.getLogs(options);

    // Log the export activity
    setTimeout(() => {
      activityLogService.logExportActivity(
        req.user.id,
        req.user.userType,
        activityLogService.logActions.EXPORT_CSV,
        {
          exportType: 'activity_logs',
          recordCount: result.logs.length,
          filters: options,
          format
        }
      ).catch(error => {
        console.error('Failed to log export activity:', error);
      });
    }, 100);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(result);
    }

    // Default to CSV
    const csv = convertLogsToCSV(result.logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Error exporting activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export activity logs',
      error: error.message
    });
  }
};

/**
 * Clean up old activity logs (Admin only)
 * DELETE /api/activity-logs/cleanup
 */
const cleanupOldLogs = async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;

    const validatedDaysOld = Math.max(30, parseInt(daysOld)); // Minimum 30 days

    const deletedCount = await activityLogService.cleanupOldLogs(validatedDaysOld);

    // Log the cleanup activity
    setTimeout(() => {
      activityLogService.logSystemEvent(
        activityLogService.logActions.SYSTEM_EVENT,
        {
          description: `Cleaned up ${deletedCount} activity logs older than ${validatedDaysOld} days`,
          metadata: {
            deletedCount,
            daysOld: validatedDaysOld,
            performedBy: req.user.id
          }
        }
      ).catch(error => {
        console.error('Failed to log cleanup activity:', error);
      });
    }, 100);

    res.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old activity logs`,
      data: {
        deletedCount,
        daysOld: validatedDaysOld
      }
    });

  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up old logs',
      error: error.message
    });
  }
};

// Helper functions

async function getTopActiveUsers(startDate, endDate) {
  try {
    const query = `
      SELECT 
        user_id,
        user_type,
        COUNT(*) as activity_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_count
      FROM Activity_Logs
      WHERE created_at >= $1 AND created_at <= $2
        AND user_id != 'SYSTEM'
      GROUP BY user_id, user_type
      ORDER BY activity_count DESC
      LIMIT 10
    `;

    const result = await query(query, [startDate.toISOString(), endDate.toISOString()]);
    return result.rows.map(row => ({
      userId: row.user_id,
      userType: row.user_type,
      activityCount: parseInt(row.activity_count),
      errorCount: parseInt(row.error_count),
      criticalCount: parseInt(row.critical_count)
    }));
  } catch (error) {
    console.error('Error getting top active users:', error);
    return [];
  }
}

function convertLogsToCSV(logs) {
  if (logs.length === 0) {
    return 'No data available';
  }

  const headers = [
    'Log ID',
    'User ID',
    'User Type',
    'Category',
    'Action',
    'Level',
    'Description',
    'IP Address',
    'Affected Resource Type',
    'Affected Resource ID',
    'Created At'
  ];

  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.logId,
      log.userId,
      log.userType,
      log.category,
      log.action,
      log.level,
      `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
      log.ipAddress || '',
      log.affectedResourceType || '',
      log.affectedResourceId || '',
      log.createdAt
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export default {
  getActivityLogs,
  getActivityStatistics,
  getUserActivityLogs,
  getResourceActivityLogs,
  getRecentActivityLogs,
  getActivityDashboard,
  exportActivityLogs,
  cleanupOldLogs
};
