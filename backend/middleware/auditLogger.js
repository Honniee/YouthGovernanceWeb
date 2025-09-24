import { query } from '../config/database.js';
import { generateLogId } from '../utils/idGenerator.js';

/**
 * Audit Logging Middleware
 * Logs all API operations for security and compliance
 */

/**
 * Automatically determine the appropriate category based on action and resource
 * @param {string} action - The action being performed
 * @param {string} resource - The resource being acted upon
 * @returns {string} The appropriate category
 */
const determineCategory = (action, resource) => {
  // Data Export operations
  if (action === 'EXPORT') {
    return 'Data Export';
  }
  
  // Data Management operations (imports, bulk data operations)
  if (action === 'BULK_IMPORT' || action.includes('IMPORT')) {
    return 'Data Management';
  }
  
  // User Management operations
  if (resource === 'staff' || resource === 'sk-officials' || resource === 'users') {
    const userManagementActions = [
      'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 
      'BULK_ACTIVATE', 'BULK_DEACTIVATE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE'
    ];
    
    if (userManagementActions.includes(action)) {
      return 'User Management';
    }
  }
  
  // Authentication operations
  if (['LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_VERIFICATION'].includes(action)) {
    return 'Authentication';
  }
  
  // Survey Management operations
  if (resource === 'surveys' || resource === 'survey') {
    return 'Survey Management';
  }
  
  // Announcement operations
  if (resource === 'announcements' || resource === 'announcement') {
    return 'Announcement';
  }
  
  // Activity Log operations (viewing, managing logs themselves)
  if (resource === 'activity-logs' || action === 'VIEW_LOGS' || action === 'CLEAR_LOGS') {
    return 'Activity Log';
  }
  
  // Default fallback for everything else
  return 'System Management';
};

/**
 * Create an audit log entry
 * @param {object} logData - Log data object
 * @returns {string|null} Log ID if successful, null otherwise
 */
export const createAuditLog = async (logData) => {
  try {
    const {
      userId,
      userType,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage = null,
      category = null // Allow manual override, but use auto-detection by default
    } = logData;

    // Auto-determine category if not explicitly provided
    const finalCategory = category || determineCategory(action, resource);

    const logId = await generateLogId();
    
    // Extract resource type from resource path
    const resourceType = resource ? resource.split('/')[1] || 'unknown' : 'unknown';
    
    const result = await query(
      `INSERT INTO "Activity_Logs" (
        log_id, user_id, user_type, action, resource_type, resource_id, 
        resource_name, details, category, success, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      RETURNING log_id`,
      [logId, userId, userType, action, resourceType, resourceId, resourceId, JSON.stringify({details, ipAddress, userAgent}), finalCategory, status === 'success', errorMessage]
    );

    console.log(`📝 Audit log created: ${result.rows[0].log_id} - ${action} on ${resourceType} (${finalCategory})`);
    return result.rows[0].log_id;

  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

/**
 * Audit logging middleware
 * Automatically logs all API requests
 */
export const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Override res.send to capture response
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the operation
      const logData = {
        userId: req.user?.id || 'anonymous',
        userType: req.user?.userType || 'anonymous',
        action: req.method,
        resource: req.baseUrl + req.path,
        resourceId: req.params.id || null,
        details: {
          method: req.method,
          url: req.originalUrl,
          query: req.query,
          body: options.logBody ? req.body : undefined,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: res.statusCode < 400 ? 'success' : 'error',
        errorMessage: res.statusCode >= 400 ? data?.message || 'Request failed' : null
      };

      // Create audit log asynchronously (don't block response)
      createAuditLog(logData).catch(err => {
        console.error('❌ Audit logging failed:', err);
      });

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Specific audit logger for staff operations
 */
export const staffAuditLogger = auditLogger({ logBody: true });

/**
 * Get audit logs for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 */
export const getUserAuditLogs = async (userId, options = {}) => {
  try {
    const { limit = 50, offset = 0, action = null, resource = null } = options;
    
    let queryText = 'SELECT * FROM "Activity_Logs" WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (action) {
      paramCount++;
      queryText += ` AND action = $${paramCount}`;
      params.push(action);
    }

    if (resource) {
      paramCount++;
      queryText += ` AND resource = $${paramCount}`;
      params.push(resource);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;

  } catch (error) {
    console.error('❌ Failed to get user audit logs:', error);
    throw new Error('Failed to get audit logs');
  }
};

/**
 * Get audit logs for a resource
 * @param {string} resource - Resource type
 * @param {string} resourceId - Resource ID
 * @param {object} options - Query options
 */
export const getResourceAuditLogs = async (resource, resourceId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;
    
    const result = await query(
      `SELECT * FROM "Activity_Logs" 
       WHERE resource = $1 AND resource_id = $2 
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [resource, resourceId, limit, offset]
    );

    return result.rows;

  } catch (error) {
    console.error('❌ Failed to get resource audit logs:', error);
    throw new Error('Failed to get audit logs');
  }
};

/**
 * Clean up old audit logs
 * @param {number} daysOld - Days old to delete
 */
export const cleanupOldAuditLogs = async (daysOld = 365) => {
  try {
    const result = await query(
      'DELETE FROM "Activity_Logs" WHERE created_at < CURRENT_TIMESTAMP - INTERVAL \'1 day\' * $1',
      [daysOld]
    );

    console.log(`✅ Cleaned up ${result.rowCount} old audit logs`);
    return result.rowCount;

  } catch (error) {
    console.error('❌ Failed to cleanup old audit logs:', error);
    return 0;
  }
};
