import { query } from '../config/database.js';
import { generateLogId } from '../utils/idGenerator.js';

/**
 * Activity Logging Service
 * Comprehensive audit trail and monitoring system
 */

class ActivityLogService {
  constructor() {
    this.logCategories = {
      USER_MANAGEMENT: 'user_management',
      SK_MANAGEMENT: 'sk_management',
      TERM_MANAGEMENT: 'term_management',
      AUTHENTICATION: 'authentication',
      DATA_EXPORT: 'data_export',
      SYSTEM_EVENT: 'system_event',
      NOTIFICATION: 'notification',
      BULK_OPERATION: 'bulk_operation'
    };

    this.logActions = {
      // User Management
      CREATE_STAFF: 'create_staff',
      UPDATE_STAFF: 'update_staff',
      DELETE_STAFF: 'delete_staff',
      ACTIVATE_STAFF: 'activate_staff',
      DEACTIVATE_STAFF: 'deactivate_staff',

      // SK Management
      CREATE_SK_OFFICIAL: 'create_sk_official',
      UPDATE_SK_OFFICIAL: 'update_sk_official',
      DELETE_SK_OFFICIAL: 'delete_sk_official',
      ACTIVATE_SK_OFFICIAL: 'activate_sk_official',
      DEACTIVATE_SK_OFFICIAL: 'deactivate_sk_official',

      // Term Management
      CREATE_TERM: 'create_term',
      UPDATE_TERM: 'update_term',
      DELETE_TERM: 'delete_term',
      ACTIVATE_TERM: 'activate_term',
      DEACTIVATE_TERM: 'deactivate_term',

      // Authentication
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILED: 'login_failed',
      LOGOUT: 'logout',
      PASSWORD_CHANGE: 'password_change',
      TOKEN_REFRESH: 'token_refresh',

      // Data Export
      EXPORT_CSV: 'export_csv',
      EXPORT_PDF: 'export_pdf',
      EXPORT_EXCEL: 'export_excel',

      // System Events
      SYSTEM_START: 'system_start',
      SYSTEM_ERROR: 'system_error',
      DATABASE_ERROR: 'database_error',
      EMAIL_SENT: 'email_sent',
      EMAIL_FAILED: 'email_failed',

      // Notifications
      NOTIFICATION_SENT: 'notification_sent',
      NOTIFICATION_READ: 'notification_read',
      NOTIFICATION_DELETED: 'notification_deleted',

      // Bulk Operations
      BULK_IMPORT: 'bulk_import',
      BULK_UPDATE: 'bulk_update',
      BULK_DELETE: 'bulk_delete',
      BULK_EXPORT: 'bulk_export'
    };

    this.logLevels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical',
      DEBUG: 'debug'
    };
  }

  /**
   * Create an activity log entry
   * @param {object} logData - Log data
   * @returns {Promise<object>} Created log entry
   */
  async createLog(logData) {
    try {
      const {
        userId,
        userType = 'unknown',
        category,
        action,
        level = this.logLevels.INFO,
        description,
        metadata = {},
        ipAddress = null,
        userAgent = null,
        affectedResourceType = null,
        affectedResourceId = null,
        oldValues = null,
        newValues = null
      } = logData;

      // Generate log ID
      const logId = await generateLogId();

      // Prepare metadata for storage
      const metadataJson = typeof metadata === 'object' 
        ? JSON.stringify(metadata) 
        : metadata;

      const oldValuesJson = oldValues 
        ? (typeof oldValues === 'object' ? JSON.stringify(oldValues) : oldValues)
        : null;

      const newValuesJson = newValues 
        ? (typeof newValues === 'object' ? JSON.stringify(newValues) : newValues)
        : null;

      const insertQuery = `
        INSERT INTO "Activity_Logs" (
          log_id, user_id, user_type, category, action, level, description,
          metadata, ip_address, user_agent, affected_resource_type, 
          affected_resource_id, old_values, new_values, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        logId,
        userId,
        userType,
        category,
        action,
        level,
        description,
        metadataJson,
        ipAddress,
        userAgent,
        affectedResourceType,
        affectedResourceId,
        oldValuesJson,
        newValuesJson
      ];

      const result = await query(insertQuery, values);
      const logEntry = result.rows[0];

      console.log(`📋 Activity logged: ${category}.${action} by ${userType}:${userId}`);
      return logEntry;

    } catch (error) {
      console.error('❌ Failed to create activity log:', error);
      throw new Error('Failed to create activity log');
    }
  }

  /**
   * Log user management activities
   */
  async logUserActivity(userId, userType, action, details = {}) {
    const {
      targetUserId,
      targetUserType,
      changes = {},
      oldValues = null,
      newValues = null,
      metadata = {}
    } = details;

    const description = this.generateUserActivityDescription(action, details);

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.USER_MANAGEMENT,
      action,
      description,
      metadata: {
        targetUserId,
        targetUserType,
        changes,
        ...metadata
      },
      affectedResourceType: targetUserType || 'user',
      affectedResourceId: targetUserId,
      oldValues,
      newValues
    });
  }

  /**
   * Log SK management activities
   */
  async logSKActivity(userId, userType, action, details = {}) {
    const {
      skId,
      skName,
      position,
      barangay,
      changes = {},
      oldValues = null,
      newValues = null,
      metadata = {}
    } = details;

    const description = this.generateSKActivityDescription(action, details);

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.SK_MANAGEMENT,
      action,
      description,
      metadata: {
        skId,
        skName,
        position,
        barangay,
        changes,
        ...metadata
      },
      affectedResourceType: 'sk_official',
      affectedResourceId: skId,
      oldValues,
      newValues
    });
  }

  /**
   * Log term management activities
   */
  async logTermActivity(userId, userType, action, details = {}) {
    const {
      termId,
      termName,
      startDate,
      endDate,
      changes = {},
      oldValues = null,
      newValues = null,
      metadata = {}
    } = details;

    const description = this.generateTermActivityDescription(action, details);

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.TERM_MANAGEMENT,
      action,
      description,
      metadata: {
        termId,
        termName,
        startDate,
        endDate,
        changes,
        ...metadata
      },
      affectedResourceType: 'sk_term',
      affectedResourceId: termId,
      oldValues,
      newValues
    });
  }

  /**
   * Log authentication activities
   */
  async logAuthActivity(userId, userType, action, details = {}) {
    const {
      ipAddress,
      userAgent,
      success = true,
      errorMessage = null,
      metadata = {}
    } = details;

    const description = this.generateAuthActivityDescription(action, details);
    const level = success ? this.logLevels.INFO : this.logLevels.WARNING;

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.AUTHENTICATION,
      action,
      level,
      description,
      metadata: {
        success,
        errorMessage,
        ...metadata
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log data export activities
   */
  async logExportActivity(userId, userType, action, details = {}) {
    const {
      exportType,
      recordCount,
      filters = {},
      fileName,
      fileSize = null,
      metadata = {}
    } = details;

    const description = this.generateExportActivityDescription(action, details);

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.DATA_EXPORT,
      action,
      description,
      metadata: {
        exportType,
        recordCount,
        filters,
        fileName,
        fileSize,
        ...metadata
      }
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(action, details = {}) {
    const {
      level = this.logLevels.INFO,
      description,
      errorMessage = null,
      stackTrace = null,
      metadata = {}
    } = details;

    return this.createLog({
      userId: 'SYSTEM',
      userType: 'system',
      category: this.logCategories.SYSTEM_EVENT,
      action,
      level,
      description: description || this.generateSystemEventDescription(action, details),
      metadata: {
        errorMessage,
        stackTrace,
        ...metadata
      }
    });
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(userId, userType, action, details = {}) {
    const {
      operationType,
      recordCount,
      successCount,
      errorCount,
      fileName = null,
      errors = [],
      metadata = {}
    } = details;

    const description = this.generateBulkOperationDescription(action, details);
    const level = errorCount > 0 ? this.logLevels.WARNING : this.logLevels.INFO;

    return this.createLog({
      userId,
      userType,
      category: this.logCategories.BULK_OPERATION,
      action,
      level,
      description,
      metadata: {
        operationType,
        recordCount,
        successCount,
        errorCount,
        fileName,
        errors: errors.slice(0, 10), // Limit errors to prevent large metadata
        ...metadata
      }
    });
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getLogs(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        userId = null,
        userType = null,
        category = null,
        action = null,
        level = null,
        startDate = null,
        endDate = null,
        affectedResourceType = null,
        affectedResourceId = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (userId) {
        paramCount++;
        whereConditions.push(`user_id = $${paramCount}`);
        queryParams.push(userId);
      }

      if (userType) {
        paramCount++;
        whereConditions.push(`user_type = $${paramCount}`);
        queryParams.push(userType);
      }

      if (category) {
        paramCount++;
        whereConditions.push(`category = $${paramCount}`);
        queryParams.push(category);
      }

      if (action) {
        paramCount++;
        whereConditions.push(`action = $${paramCount}`);
        queryParams.push(action);
      }

      if (level) {
        paramCount++;
        whereConditions.push(`level = $${paramCount}`);
        queryParams.push(level);
      }

      if (startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
      }

      if (affectedResourceType) {
        paramCount++;
        whereConditions.push(`affected_resource_type = $${paramCount}`);
        queryParams.push(affectedResourceType);
      }

      if (affectedResourceId) {
        paramCount++;
        whereConditions.push(`affected_resource_id = $${paramCount}`);
        queryParams.push(affectedResourceId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sort parameters
      const allowedSortFields = ['created_at', 'user_id', 'category', 'action', 'level'];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Main query
      const logsQuery = `
        SELECT 
          *,
          COUNT(*) OVER() as total_count
        FROM "Activity_Logs"
        ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await query(logsQuery, queryParams);
      const logs = result.rows;
      const totalRecords = logs.length > 0 ? parseInt(logs[0].total_count) : 0;
      const totalPages = Math.ceil(totalRecords / limit);

      return {
        logs: logs.map(log => ({
          logId: log.log_id,
          userId: log.user_id,
          userType: log.user_type,
          category: log.category,
          action: log.action,
          level: log.level,
          description: log.description,
          metadata: log.metadata ? JSON.parse(log.metadata) : {},
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          affectedResourceType: log.affected_resource_type,
          affectedResourceId: log.affected_resource_id,
          oldValues: log.old_values ? JSON.parse(log.old_values) : null,
          newValues: log.new_values ? JSON.parse(log.new_values) : null,
          createdAt: log.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Failed to get activity logs:', error);
      throw new Error('Failed to get activity logs');
    }
  }

  /**
   * Get activity statistics
   */
  async getStatistics(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        userId = null,
        userType = null
      } = options;

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
      }

      if (userId) {
        paramCount++;
        whereConditions.push(`user_id = $${paramCount}`);
        queryParams.push(userId);
      }

      if (userType) {
        paramCount++;
        whereConditions.push(`user_type = $${paramCount}`);
        queryParams.push(userType);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'info' THEN 1 END) as info_count,
          COUNT(CASE WHEN level = 'warning' THEN 1 END) as warning_count,
          COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN category = 'user_management' THEN 1 END) as user_management_count,
          COUNT(CASE WHEN category = 'sk_management' THEN 1 END) as sk_management_count,
          COUNT(CASE WHEN category = 'term_management' THEN 1 END) as term_management_count,
          COUNT(CASE WHEN category = 'authentication' THEN 1 END) as authentication_count,
          COUNT(CASE WHEN category = 'data_export' THEN 1 END) as data_export_count,
          COUNT(CASE WHEN category = 'system_event' THEN 1 END) as system_event_count,
          COUNT(CASE WHEN category = 'bulk_operation' THEN 1 END) as bulk_operation_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM "Activity_Logs"
        ${whereClause}
      `;

      const result = await query(statsQuery, queryParams);
      const stats = result.rows[0];

      return {
        overview: {
          totalLogs: parseInt(stats.total_logs),
          uniqueUsers: parseInt(stats.unique_users),
          activeDays: parseInt(stats.active_days)
        },
        levels: {
          info: parseInt(stats.info_count),
          warning: parseInt(stats.warning_count),
          error: parseInt(stats.error_count),
          critical: parseInt(stats.critical_count)
        },
        categories: {
          userManagement: parseInt(stats.user_management_count),
          skManagement: parseInt(stats.sk_management_count),
          termManagement: parseInt(stats.term_management_count),
          authentication: parseInt(stats.authentication_count),
          dataExport: parseInt(stats.data_export_count),
          systemEvent: parseInt(stats.system_event_count),
          bulkOperation: parseInt(stats.bulk_operation_count)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get activity statistics:', error);
      throw new Error('Failed to get activity statistics');
    }
  }

  /**
   * Clean up old activity logs
   */
  async cleanupOldLogs(daysOld = 90) {
    try {
      const deleteQuery = `
        DELETE FROM "Activity_Logs" 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
      `;

      const result = await query(deleteQuery, [daysOld]);
      console.log(`🧹 Cleaned up ${result.rowCount} activity logs older than ${daysOld} days`);
      return result.rowCount;

    } catch (error) {
      console.error('❌ Failed to cleanup old logs:', error);
      throw new Error('Failed to cleanup old logs');
    }
  }

  // Helper methods for generating descriptions
  generateUserActivityDescription(action, details) {
    const { targetUserId, targetUserType, changes } = details;
    const changesList = Object.keys(changes).join(', ');
    
    switch (action) {
      case this.logActions.CREATE_STAFF:
        return `Created new staff member ${targetUserId}`;
      case this.logActions.UPDATE_STAFF:
        return `Updated staff member ${targetUserId}${changesList ? ` (${changesList})` : ''}`;
      case this.logActions.DELETE_STAFF:
        return `Deleted staff member ${targetUserId}`;
      case this.logActions.ACTIVATE_STAFF:
        return `Activated staff member ${targetUserId}`;
      case this.logActions.DEACTIVATE_STAFF:
        return `Deactivated staff member ${targetUserId}`;
      default:
        return `${action} on ${targetUserType} ${targetUserId}`;
    }
  }

  generateSKActivityDescription(action, details) {
    const { skId, skName, position, barangay } = details;
    const name = skName || skId;
    
    switch (action) {
      case this.logActions.CREATE_SK_OFFICIAL:
        return `Created SK Official ${name} as ${position} in ${barangay}`;
      case this.logActions.UPDATE_SK_OFFICIAL:
        return `Updated SK Official ${name}`;
      case this.logActions.DELETE_SK_OFFICIAL:
        return `Deleted SK Official ${name}`;
      case this.logActions.ACTIVATE_SK_OFFICIAL:
        return `Activated SK Official ${name}`;
      case this.logActions.DEACTIVATE_SK_OFFICIAL:
        return `Deactivated SK Official ${name}`;
      default:
        return `${action} on SK Official ${name}`;
    }
  }

  generateTermActivityDescription(action, details) {
    const { termId, termName } = details;
    const name = termName || termId;
    
    switch (action) {
      case this.logActions.CREATE_TERM:
        return `Created SK Term "${name}"`;
      case this.logActions.UPDATE_TERM:
        return `Updated SK Term "${name}"`;
      case this.logActions.DELETE_TERM:
        return `Deleted SK Term "${name}"`;
      case this.logActions.ACTIVATE_TERM:
        return `Activated SK Term "${name}"`;
      case this.logActions.DEACTIVATE_TERM:
        return `Completed SK Term "${name}"`;
      default:
        return `${action} on SK Term "${name}"`;
    }
  }

  generateAuthActivityDescription(action, details) {
    const { success, errorMessage } = details;
    
    switch (action) {
      case this.logActions.LOGIN_SUCCESS:
        return 'User logged in successfully';
      case this.logActions.LOGIN_FAILED:
        return `Login failed${errorMessage ? `: ${errorMessage}` : ''}`;
      case this.logActions.LOGOUT:
        return 'User logged out';
      case this.logActions.PASSWORD_CHANGE:
        return 'User changed password';
      case this.logActions.TOKEN_REFRESH:
        return 'JWT token refreshed';
      default:
        return `Authentication: ${action}`;
    }
  }

  generateExportActivityDescription(action, details) {
    const { exportType, recordCount, fileName } = details;
    
    return `Exported ${recordCount} ${exportType} records${fileName ? ` to ${fileName}` : ''}`;
  }

  generateSystemEventDescription(action, details) {
    const { errorMessage } = details;
    
    switch (action) {
      case this.logActions.SYSTEM_START:
        return 'System started successfully';
      case this.logActions.SYSTEM_ERROR:
        return `System error occurred${errorMessage ? `: ${errorMessage}` : ''}`;
      case this.logActions.DATABASE_ERROR:
        return `Database error${errorMessage ? `: ${errorMessage}` : ''}`;
      case this.logActions.EMAIL_SENT:
        return 'Email sent successfully';
      case this.logActions.EMAIL_FAILED:
        return `Email delivery failed${errorMessage ? `: ${errorMessage}` : ''}`;
      default:
        return `System event: ${action}`;
    }
  }

  generateBulkOperationDescription(action, details) {
    const { operationType, recordCount, successCount, errorCount } = details;
    
    return `Bulk ${operationType}: ${successCount}/${recordCount} successful${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
  }
}

// Create singleton instance
const activityLogService = new ActivityLogService();

export default activityLogService;
