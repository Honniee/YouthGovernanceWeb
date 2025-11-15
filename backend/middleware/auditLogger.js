import { query } from '../config/database.js';
import { generateLogId } from '../utils/idGenerator.js';
import { generateActivityMessage } from '../utils/activityLogMessageGenerator.js';
import { maskEmail, maskContact, extractBirthYear, maskFullName } from '../utils/dataMasking.js';
import logger from '../utils/logger.js';

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
  // Normalize action to uppercase for comparison (support both uppercase and title case)
  const actionUpper = action.toUpperCase();
  const actionNormalized = actionUpper.replace(/ /g, '_'); // "Bulk Activate" -> "BULK_ACTIVATE"
  
  // Extract resource name from paths like "/api/staff" -> "staff", "/api/sk-officials/bulk/status" -> "sk-officials"
  // Use same logic as resourceType extraction to skip action segments
  // For council routes, also skip: members, roles, page (so we get 'council' instead)
  let resourceName = resource;
  if (resource && resource.includes('/')) {
    const parts = resource.split('/').filter(p => p && p !== 'api');
    const actionSegments = ['export', 'bulk', 'template', 'import', 'stats', 'search', 'csv', 'pdf', 'excel', 'xlsx', 'json', 'status', 'members', 'roles', 'page'];
    
    // Find the first non-action segment from the end (the actual resource name)
    // For /api/council/members/bulk -> parts = ['council', 'members', 'bulk']
    // We want 'council', not 'members' or 'bulk'
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!actionSegments.includes(parts[i])) {
        resourceName = parts[i];
        break;
      }
    }
    
    // Fallback: if all segments are action segments, use the first one
    if (resourceName === resource && parts.length > 0) {
      resourceName = parts[0];
    }
  }
  
  // Data Export operations (including bulk exports)
  // Check if action contains "EXPORT" (case-insensitive) to catch "Export", "Bulk Export", etc.
  if (actionUpper.includes('EXPORT')) {
    return 'Data Export';
  }
  
  // Data Management operations (imports, bulk data operations)
  // This includes voter bulk imports and other import operations
  if (actionNormalized === 'BULK_IMPORT' || actionUpper.includes('IMPORT')) {
    return 'Data Management';
  }

  // Voter Management operations (CRUD operations, but NOT imports/exports)
  // Check both resource path and resourceName to catch voter CRUD operations
  const isVoterResource = resourceName === 'voters' || resourceName === 'voter' || 
                         (resource && resource.includes('/voters'));
  
  if (isVoterResource) {
    // Voter CRUD operations should be Data Management
    return 'Data Management';
  }
  
  // SK Governance operations (sk-terms and council)
  // Check both the extracted resourceName AND if the resource path contains 'council' or 'sk-terms'
  const isSKGovernanceResource = resourceName === 'sk-terms' || resourceName === 'council' || 
                                  (resource && (resource.includes('/council') || resource.includes('/sk-terms')));
  
  if (isSKGovernanceResource) {
    const skGovernanceActions = [
      'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'COMPLETE', 'EXTEND',
      'Create', 'Update', 'Delete', 'Activate', 'Deactivate', 'Complete', 'Extend',
      'Force Activate', 'FORCE_ACTIVATE', 'Force Complete', 'FORCE_COMPLETE',
      'Force Extend', 'FORCE_EXTEND',
      'CREATE_COUNCIL_ROLE', 'UPDATE_COUNCIL_ROLE', 'DELETE_COUNCIL_ROLE',
      'CREATE_COUNCIL_MEMBER', 'UPDATE_COUNCIL_MEMBER', 'DELETE_COUNCIL_MEMBER',
      'UPDATE_COUNCIL_PAGE',
      'BULK_ACTIVATE', 'BULK_DEACTIVATE', 'BULK_DELETE',
      'Bulk Activate', 'Bulk Deactivate', 'Bulk Delete'
    ];
    
    // Check if action matches - including "Bulk Activate", "Bulk Deactivate", "Bulk Delete"
    // Also check for simple actions (Create, Update, Delete) if resource is council-related
    const matchesAction = skGovernanceActions.includes(action) || 
                         actionNormalized.match(/^(CREATE|UPDATE|DELETE|ACTIVATE|DEACTIVATE|COMPLETE|EXTEND)$/) || 
                         actionNormalized.match(/^(FORCE_ACTIVATE|FORCE_COMPLETE|FORCE_EXTEND|FORCE (ACTIVATE|COMPLETE|EXTEND))$/) || 
                         actionNormalized.match(/^(CREATE_COUNCIL_|UPDATE_COUNCIL_|DELETE_COUNCIL_|UPDATE_COUNCIL_PAGE)$/) || 
                         actionNormalized.match(/^(BULK_(ACTIVATE|DEACTIVATE|DELETE))$/) ||
                         ((action === 'Create' || action === 'Update' || action === 'Delete') && isSKGovernanceResource);
    
    if (matchesAction) {
      return 'SK Governance';
    }
  }
  
  // User Management operations (staff, sk-officials, users, youth)
  if (resourceName === 'staff' || resourceName === 'sk-officials' || resourceName === 'users' || resourceName === 'youth') {
    const userManagementActions = [
      'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE',
      'BULK_ACTIVATE', 'BULK_DEACTIVATE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE',
      'Create', 'Update', 'Delete', 'Activate', 'Deactivate',
      'Bulk Activate', 'Bulk Deactivate', 'Bulk Create', 'Bulk Update', 'Bulk Delete',
      'Archive', 'Unarchive', 'Bulk Archive', 'Bulk Unarchive'
    ];
    
    if (userManagementActions.includes(action) || actionNormalized.match(/^(CREATE|UPDATE|DELETE|ACTIVATE|DEACTIVATE|BULK_(ACTIVATE|DEACTIVATE|CREATE|UPDATE|DELETE))$/) || actionNormalized.match(/^(ARCHIVE|UNARCHIVE|BULK_(ARCHIVE|UNARCHIVE))$/)) {
      return 'User Management';
    }
  }
  
  // Authentication operations
  const authActions = ['LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_VERIFICATION',
                       'Login', 'Logout', 'Password Reset', 'Password Change', 'Email Verification'];
  if (authActions.includes(action) || actionUpper.match(/^(LOGIN|LOGOUT|PASSWORD_(RESET|CHANGE)|EMAIL_VERIFICATION)$/)) {
    return 'Authentication';
  }
  
  // Survey Management operations
  if (resourceName === 'surveys' || resourceName === 'survey' || resourceName === 'survey-batches') {
    return 'Survey Management';
  }
  
  // Announcement operations
  if (resourceName === 'announcements' || resourceName === 'announcement') {
    return 'Announcement Management';
  }
  
  // Activity Log operations (viewing, managing logs themselves)
  if (resourceName === 'activity-logs' || actionUpper === 'VIEW_LOGS' || actionUpper === 'CLEAR_LOGS') {
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
      resourceName, // New: explicit resource name
      resourceType: providedResourceType = null, // Allow manual override of resource type
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage = null,
      category = null, // Allow manual override, but use auto-detection by default
      message = null // New: Allow pre-generated message
    } = logData;

    // Auto-determine category if not explicitly provided
    const finalCategory = category || determineCategory(action, resource);

    // Mask sensitive survey data in details if present
    const maskedDetails = maskSensitiveSurveyData(details);

    const logId = await generateLogId();
    
    // Extract resource type from resource path (e.g., "/api/staff" -> "staff", "/api/staff/export" -> "staff", "/api/staff/export/csv" -> "staff", "/api/staff/bulk/import" -> "staff")
    // If resourceType is explicitly provided, use it instead of auto-extraction
    let resourceType = providedResourceType || 'unknown';
    if (!providedResourceType && resource) {
      if (resource.includes('/')) {
        const parts = resource.split('/').filter(p => p && p !== 'api');
        // Common action segments to skip: export, bulk, template, import, stats, search, csv, pdf, excel, xlsx, json, status
        // For council routes, also skip: members, roles, page (so we get 'council' instead)
        const actionSegments = ['export', 'bulk', 'template', 'import', 'stats', 'search', 'csv', 'pdf', 'excel', 'xlsx', 'json', 'status', 'members', 'roles', 'page'];
        
        // Find the first non-action segment from the end (the actual resource type)
        // For /api/council/members/bulk -> parts = ['council', 'members', 'bulk']
        // We want 'council', not 'members' or 'bulk'
        for (let i = parts.length - 1; i >= 0; i--) {
          if (!actionSegments.includes(parts[i])) {
            resourceType = parts[i];
            break;
          }
        }
        
        // Fallback: if all segments are action segments (shouldn't happen), use the first one
        if (resourceType === 'unknown' && parts.length > 0) {
          resourceType = parts[0];
        }
      } else {
        resourceType = resource;
      }
    }
    
    // Generate message if not provided
    let finalMessage = message;
    if (!finalMessage) {
      try {
        finalMessage = await generateActivityMessage(
          action,
          { userId, userType },
          {
            name: resourceName || details?.name || details?.batchName || details?.title || details?.member_name || details?.role_name || details?.youthName || details?.skName || details?.staffName,
            resourceType,
            batchName: details?.batchName,
            youthName: details?.youthName,
            barangay: details?.barangay || details?.barangayName,
            role_name: details?.role_name,
            member_name: details?.member_name
          },
          details
        );
      } catch (msgError) {
        logger.error('Error generating activity message', { error: msgError.message, stack: msgError.stack });
        // Fallback to simple message
        finalMessage = `${userType || 'User'} performed ${action}`;
      }
    }
    
    // Use timezone-aware timestamp to ensure consistent timezone (Asia/Manila)
    // Since connection timezone is set to Asia/Manila in database.js getClient(),
    // NOW() will return time in Asia/Manila timezone
    // Using AT TIME ZONE 'Asia/Manila' explicitly converts to Asia/Manila and returns TIMESTAMP (without timezone)
    // This ensures consistent timestamps regardless of database server timezone
    const result = await query(
      `INSERT INTO "Activity_Logs" (
        log_id, user_id, user_type, action, resource_type, resource_id, 
        resource_name, details, category, success, error_message, message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, (NOW() AT TIME ZONE 'Asia/Manila'))
      RETURNING log_id`,
      [logId, userId, userType, action, resourceType, resourceId, resourceName || resourceId, JSON.stringify({details: maskedDetails, ipAddress, userAgent}), finalCategory, status === 'success', errorMessage, finalMessage]
    );

    logger.debug('Audit log created', { 
      logId: result.rows[0].log_id, 
      action, 
      resourceType, 
      category: finalCategory 
    });
    return result.rows[0].log_id;

  } catch (error) {
    logger.error('Failed to create audit log', { 
      error: error.message, 
      stack: error.stack,
      action,
      resourceType 
    });
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

/**
 * Mask sensitive survey data in details object
 * Provides a safety net to ensure sensitive data is masked even if not masked at source
 */
const maskSensitiveSurveyData = (details) => {
  if (!details || typeof details !== 'object') return details;
  
  const masked = { ...details };
  
  // Mask email fields
  if (masked.email && typeof masked.email === 'string' && !masked.email.includes('***')) {
    masked.email = maskEmail(masked.email);
  }
  
  // Mask contact number fields (various field names)
  const contactFields = ['contact_number', 'contactNumber', 'contact', 'phone', 'mobile'];
  contactFields.forEach(field => {
    if (masked[field] && typeof masked[field] === 'string' && !masked[field].includes('***')) {
      masked[field] = maskContact(masked[field]);
    }
  });
  
  // Mask birth date - extract only year if full date present
  const birthDateFields = ['birth_date', 'birthDate', 'birthday'];
  birthDateFields.forEach(field => {
    if (masked[field] && typeof masked[field] === 'string') {
      const year = extractBirthYear(masked[field]);
      if (year) {
        masked[`${field}_year`] = year;
        delete masked[field]; // Remove full date
      }
    }
  });
  
  // Mask name fields if present as objects
  if (masked.name && typeof masked.name === 'object') {
    masked.name = maskFullName(
      masked.name.firstName || masked.name.first_name,
      masked.name.lastName || masked.name.last_name,
      masked.name.middleName || masked.name.middle_name
    );
  }
  
  // Recursively mask nested objects
  Object.keys(masked).forEach(key => {
    if (masked[key] && typeof masked[key] === 'object' && !Array.isArray(masked[key])) {
      masked[key] = maskSensitiveSurveyData(masked[key]);
    }
  });
  
  return masked;
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
        logger.error('Audit logging failed', { error: err.message, stack: err.stack });
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
    logger.error('Failed to get user audit logs', { error: error.message, stack: error.stack, userId });
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
    logger.error('Failed to get resource audit logs', { error: error.message, stack: error.stack, resource, resourceId });
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

    logger.info('Cleaned up old audit logs', { count: result.rowCount, daysOld });
    return result.rowCount;

  } catch (error) {
    logger.error('Failed to cleanup old audit logs', { error: error.message, stack: error.stack, daysOld });
    return 0;
  }
};
