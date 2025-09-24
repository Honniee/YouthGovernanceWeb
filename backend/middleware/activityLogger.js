import activityLogService from '../services/activityLogService.js';

/**
 * Activity Logging Middleware
 * Automatically logs API requests and responses
 */

/**
 * Request logging middleware
 * Logs all API requests with user context
 */
export const logRequest = (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;
  
  // Capture request start time
  req.startTime = Date.now();
  
  // Extract request information
  req.requestLog = {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: sanitizeHeaders(req.headers),
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent') || null,
    timestamp: new Date()
  };

  // Override res.end to capture response
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - req.startTime;
    
    // Capture response information
    req.responseLog = {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length') || (chunk ? chunk.length : 0)
    };

    // Log the request asynchronously (fire-and-forget)
    setImmediate(() => {
      logAPIRequest(req, res).catch(error => {
        console.error('❌ Failed to log API request:', error);
      });
    });

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Activity logging wrapper for controllers
 * Use this to wrap controller functions that need activity logging
 */
export const withActivityLog = (category, action, options = {}) => {
  return (controllerFunction) => {
    return async (req, res, next) => {
      try {
        // Execute the original controller function
        const result = await controllerFunction(req, res, next);
        
        // Log successful activity
        if (req.user && res.statusCode < 400) {
          const logData = extractActivityLogData(req, res, category, action, options);
          
          // Log asynchronously
          setImmediate(() => {
            activityLogService.createLog(logData).catch(error => {
              console.error('❌ Failed to log activity:', error);
            });
          });
        }
        
        return result;
      } catch (error) {
        // Log error activity
        if (req.user) {
          const logData = extractActivityLogData(req, res, category, action, {
            ...options,
            level: activityLogService.logLevels.ERROR,
            errorMessage: error.message
          });
          
          // Log asynchronously
          setImmediate(() => {
            activityLogService.createLog(logData).catch(logError => {
              console.error('❌ Failed to log error activity:', logError);
            });
          });
        }
        
        throw error;
      }
    };
  };
};

/**
 * Specialized logging functions for different activity types
 */

/**
 * Log user management activities
 */
export const logUserActivity = async (req, action, details = {}) => {
  if (!req.user) return;
  
  try {
    await activityLogService.logUserActivity(
      req.user.id,
      req.user.userType,
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime(),
          ipAddress: req.requestLog?.ipAddress,
          userAgent: req.requestLog?.userAgent
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log user activity:', error);
  }
};

/**
 * Log SK management activities
 */
export const logSKActivity = async (req, action, details = {}) => {
  if (!req.user) return;
  
  try {
    await activityLogService.logSKActivity(
      req.user.id,
      req.user.userType,
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime(),
          ipAddress: req.requestLog?.ipAddress,
          userAgent: req.requestLog?.userAgent
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log SK activity:', error);
  }
};

/**
 * Log term management activities
 */
export const logTermActivity = async (req, action, details = {}) => {
  if (!req.user) return;
  
  try {
    await activityLogService.logTermActivity(
      req.user.id,
      req.user.userType,
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime(),
          ipAddress: req.requestLog?.ipAddress,
          userAgent: req.requestLog?.userAgent
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log term activity:', error);
  }
};

/**
 * Log authentication activities
 */
export const logAuthActivity = async (req, action, details = {}) => {
  try {
    const userId = req.user?.id || details.userId || 'anonymous';
    const userType = req.user?.userType || details.userType || 'unknown';
    
    await activityLogService.logAuthActivity(
      userId,
      userType,
      action,
      {
        ...details,
        ipAddress: req.requestLog?.ipAddress || getClientIP(req),
        userAgent: req.requestLog?.userAgent || req.get('User-Agent'),
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime() || Date.now()
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log auth activity:', error);
  }
};

/**
 * Log export activities
 */
export const logExportActivity = async (req, action, details = {}) => {
  if (!req.user) return;
  
  try {
    await activityLogService.logExportActivity(
      req.user.id,
      req.user.userType,
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime(),
          ipAddress: req.requestLog?.ipAddress,
          userAgent: req.requestLog?.userAgent
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log export activity:', error);
  }
};

/**
 * Log bulk operations
 */
export const logBulkOperation = async (req, action, details = {}) => {
  if (!req.user) return;
  
  try {
    await activityLogService.logBulkOperation(
      req.user.id,
      req.user.userType,
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          requestId: req.requestLog?.timestamp?.getTime(),
          ipAddress: req.requestLog?.ipAddress,
          userAgent: req.requestLog?.userAgent
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to log bulk operation:', error);
  }
};

/**
 * Helper functions
 */

async function logAPIRequest(req, res) {
  try {
    // Skip logging for certain endpoints
    if (shouldSkipLogging(req.path)) {
      return;
    }

    const isError = res.statusCode >= 400;
    const level = isError ? 'warning' : 'info';
    
    const logData = {
      userId: req.user?.id || 'anonymous',
      userType: req.user?.userType || 'unknown',
      category: 'system_event',
      action: 'api_request',
      level,
      description: `${req.method} ${req.path} - ${res.statusCode}`,
      metadata: {
        request: req.requestLog,
        response: req.responseLog,
        user: req.user ? {
          id: req.user.id,
          userType: req.user.userType,
          role: req.user.role
        } : null
      },
      ipAddress: req.requestLog.ipAddress,
      userAgent: req.requestLog.userAgent
    };

    await activityLogService.createLog(logData);
  } catch (error) {
    console.error('❌ Failed to log API request:', error);
  }
}

function extractActivityLogData(req, res, category, action, options) {
  const {
    level = 'info',
    description,
    affectedResourceType,
    affectedResourceId,
    oldValues,
    newValues,
    errorMessage,
    ...metadata
  } = options;

  return {
    userId: req.user.id,
    userType: req.user.userType,
    category,
    action,
    level: errorMessage ? 'error' : level,
    description: description || `${action} performed`,
    metadata: {
      ...metadata,
      requestId: req.requestLog?.timestamp?.getTime(),
      statusCode: res.statusCode,
      responseTime: req.responseLog?.responseTime,
      errorMessage
    },
    ipAddress: req.requestLog?.ipAddress,
    userAgent: req.requestLog?.userAgent,
    affectedResourceType,
    affectedResourceId,
    oldValues,
    newValues
  };
}

function sanitizeRequestBody(body) {
  if (!body) return null;
  
  // Create a copy to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  function removeSensitiveData(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitiveData(obj[key]);
      }
    }
    
    return obj;
  }
  
  return removeSensitiveData(sanitized);
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  
  return {
    'content-type': sanitized['content-type'],
    'user-agent': sanitized['user-agent'],
    'accept': sanitized.accept,
    'host': sanitized.host,
    'referer': sanitized.referer
  };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

function shouldSkipLogging(path) {
  const skipPaths = [
    '/api/health',
    '/favicon.ico',
    '/robots.txt'
  ];
  
  return skipPaths.some(skipPath => path.startsWith(skipPath));
}

export default {
  logRequest,
  withActivityLog,
  logUserActivity,
  logSKActivity,
  logTermActivity,
  logAuthActivity,
  logExportActivity,
  logBulkOperation
};


























