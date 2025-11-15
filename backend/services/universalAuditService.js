import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * Universal Audit Service
 * Provides standardized activity logging for all management systems
 * Following exact Staff Management patterns for consistency
 */
class UniversalAuditService {
  constructor() {
    // Entity configurations defining how each entity type should be handled
    this.entityConfigs = {
      'staff': {
        resource: 'staff',
        idField: 'lydoId',
        nameTemplate: (data) => `${data.firstName} ${data.lastName}`,
        table: 'LYDO',
        displayName: 'Staff Member',
        displayNamePlural: 'Staff Members'
      },
      'sk-officials': {
        resource: 'sk-officials',
        idField: 'skId',
        nameTemplate: (data) => `${data.firstName} ${data.lastName} (${data.position})`,
        table: 'SK_Officials',
        displayName: 'SK Official',
        displayNamePlural: 'SK Officials'
      },
      'sk-terms': {
        resource: 'sk-terms',
        idField: 'termId',
        nameTemplate: (data) => `${data.termName}`,
        table: 'SK_Terms',
        displayName: 'SK Term',
        displayNamePlural: 'SK Terms'
      },
      'surveys': {
        resource: 'surveys',
        idField: 'surveyId',
        nameTemplate: (data) => `${data.title}`,
        table: 'Surveys',
        displayName: 'Survey',
        displayNamePlural: 'Surveys'
      },
      'announcements': {
        resource: 'announcements',
        idField: 'announcementId',
        nameTemplate: (data) => `${data.title}`,
        table: 'Announcements',
        displayName: 'Announcement',
        displayNamePlural: 'Announcements'
      },
      'reports': {
        resource: 'reports',
        idField: 'reportType',
        nameTemplate: (data) => `${data.reportType} (${data.recordCount} records)`,
        table: 'Reports',
        displayName: 'Report',
        displayNamePlural: 'Reports'
      }
    };
  }

  /**
   * Log entity creation - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity ('staff', 'sk-officials', 'sk-terms', etc.)
   * @param {object} entityData - Entity data
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logCreation(entityType, entityData, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      // Follow exact Staff Management createAuditLog pattern
      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: 'CREATE',
        resource: config.resource,
        resourceId: entityData[config.idField],
        details: `Created ${config.displayName}: ${config.nameTemplate(entityData)}`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} creation`, { error: error.message, stack: error.stack, entityType });
      return null;
    }
  }

  /**
   * Log entity update - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @param {object} entityData - Updated entity data
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logUpdate(entityType, entityId, entityData, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: 'UPDATE',
        resource: config.resource,
        resourceId: entityId,
        details: `Updated ${config.displayName}: ${config.nameTemplate(entityData)}`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} update`, { error: error.message, stack: error.stack, entityType, entityId });
      return null;
    }
  }

  /**
   * Log status change - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @param {string} newStatus - New status ('active', 'inactive', etc.)
   * @param {object} entityData - Entity data
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logStatusChange(entityType, entityId, newStatus, entityData, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      // Enhanced action mapping for different entity types and statuses
      let action, actionText;
      
      if (entityType === 'sk-terms') {
        // Special handling for SK Terms
        if (newStatus === 'active') {
          action = 'ACTIVATE';
          actionText = 'Activated';
        } else if (newStatus === 'completed') {
          action = 'COMPLETE';
          actionText = 'Completed';
        } else if (newStatus === 'upcoming') {
          action = 'CREATE';
          actionText = 'Created';
        } else {
          action = 'DEACTIVATE';
          actionText = 'Deactivated';
        }
      } else {
        // Default behavior for other entities
        action = newStatus === 'active' ? 'ACTIVATE' : 'DEACTIVATE';
        actionText = newStatus === 'active' ? 'Activated' : 'Deactivated';
      }

      // Ensure we have a valid user ID - check multiple possible ID fields
      let userId = userContext?.id || userContext?.lydo_id || userContext?.lydoId;
      
      // Only use 'SYSTEM' for automated/system actions, not for admin actions
      if (!userId && userContext?.userType === 'admin') {
        logger.warn('Admin action without user ID - this should not happen', { entityType, entityId, userContext });
        userId = null; // Let the database handle this appropriately
      } else if (!userId) {
        userId = 'SYSTEM'; // For automated/system actions
      }

      return await createAuditLog({
        userId: userId,
        userType: userContext?.userType || 'admin',
        action: action,
        resource: config.resource,
        resourceId: entityId,
        details: `${actionText} ${config.displayName}: ${config.nameTemplate(entityData)}`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} status change`, { error: error.message, stack: error.stack, entityType, entityId, newStatus });
      return null;
    }
  }

  /**
   * Log deletion - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @param {object} entityData - Entity data before deletion
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logDeletion(entityType, entityId, entityData, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: 'DELETE',
        resource: config.resource,
        resourceId: entityId,
        details: `Deleted ${config.displayName}: ${config.nameTemplate(entityData)}`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} deletion`, { error: error.message, stack: error.stack, entityType, entityId });
      return null;
    }
  }

  /**
   * Log bulk operation - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} operation - Operation type ('activate', 'deactivate', 'delete')
   * @param {Array} entityIds - Array of entity IDs
   * @param {Array} entityList - Array of entity data objects
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logBulkOperation(entityType, operation, entityIds, entityList, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      // Follow exact Staff Management bulk action naming pattern
      const action = `BULK_${operation.toUpperCase()}`;
      const entityNames = entityList.map(entity => config.nameTemplate(entity)).join(', ');
      const operationText = operation.charAt(0).toUpperCase() + operation.slice(1);

      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: action,
        resource: config.resource,
        resourceId: entityIds.join(','),
        details: `Bulk ${operationText} ${config.displayNamePlural}: ${entityNames} (${entityList.length} items)`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} bulk operation`, { error: error.message, stack: error.stack, entityType, operation });
      return null;
    }
  }

  /**
   * Log bulk import - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} fileName - Import file name
   * @param {object} importSummary - Import summary (totalRows, importedRecords, errors)
   * @param {object} userContext - User context from request
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logBulkImport(entityType, fileName, importSummary, userContext) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: 'BULK_IMPORT',
        resource: config.resource,
        resourceId: `bulk-${Date.now()}`,
        details: `Bulk imported ${importSummary.importedRecords} ${config.displayNamePlural} from ${fileName} (${importSummary.totalRows} total rows, ${importSummary.errors} errors)`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Failed to log ${entityType} bulk import`, { error: error.message, stack: error.stack, entityType, fileName });
      return null;
    }
  }

  /**
   * Log individual creation during bulk import - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {object} entityData - Entity data
   * @param {object} userContext - User context from request
   * @param {number} index - Index in bulk operation (for staggered logging)
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logBulkImportIndividual(entityType, entityData, userContext, index = 0) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      // Follow exact Staff Management staggered async pattern
      setTimeout(() => {
        createAuditLog({
          userId: userContext?.id || 'SYSTEM',
          userType: userContext?.userType || 'admin',
          action: 'CREATE',
          resource: config.resource,
          resourceId: entityData[config.idField],
          details: `Created ${config.displayName} via bulk import: ${config.nameTemplate(entityData)}`,
          ipAddress: userContext?.ipAddress || '127.0.0.1',
          userAgent: userContext?.userAgent || 'Bulk Import',
          status: 'success'
        }).catch(err => logger.error('Individual audit log failed', { error: err.message, stack: err.stack, entityType, entityId: entityData[config.idField] }));
      }, index * 50); // Stagger by 50ms intervals

      return true;
    } catch (error) {
      logger.error(`Failed to log ${entityType} individual import`, { error: error.message, stack: error.stack, entityType });
      return null;
    }
  }

  /**
   * Log error - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   * @param {object} userContext - User context from request
   * @param {string} resourceId - Resource ID if available
   * @returns {Promise<string|null>} Log ID if successful
   */
  async logError(entityType, operation, error, userContext, resourceId = 'unknown') {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return null;
      }

      return await createAuditLog({
        userId: userContext?.id || 'SYSTEM',
        userType: userContext?.userType || 'admin',
        action: operation,
        resource: config.resource,
        resourceId: resourceId,
        details: `Failed to ${operation.toLowerCase()} ${config.displayName}: ${error.message}`,
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        status: 'error',
        errorMessage: error.message
      });
    } catch (logError) {
      logger.error(`Failed to log ${entityType} error`, { error: logError.message, stack: logError.stack, entityType, operation, resourceId });
      return null;
    }
  }

  /**
   * Create user context object from request - Helper method
   * @param {object} req - Express request object
   * @returns {object} User context object
   */
  createUserContext(req) {
    return {
      id: req.user?.lydo_id || req.user?.lydoId || req.user?.id,
      lydo_id: req.user?.lydo_id || req.user?.lydoId,
      lydoId: req.user?.lydoId || req.user?.lydo_id,
      userType: req.user?.userType || 'admin',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
  }

  /**
   * Get entity configuration
   * @param {string} entityType - Type of entity
   * @returns {object|null} Entity configuration
   */
  getEntityConfig(entityType) {
    return this.entityConfigs[entityType] || null;
  }

  /**
   * Get all supported entity types
   * @returns {Array<string>} Array of supported entity types
   */
  getSupportedEntityTypes() {
    return Object.keys(this.entityConfigs);
  }

  /**
   * Add new entity type configuration
   * @param {string} entityType - Type of entity
   * @param {object} config - Entity configuration
   */
  addEntityType(entityType, config) {
    this.entityConfigs[entityType] = {
      resource: config.resource,
      idField: config.idField,
      nameTemplate: config.nameTemplate,
      table: config.table,
      displayName: config.displayName,
      displayNamePlural: config.displayNamePlural
    };
  }
}

// Create singleton instance
const universalAuditService = new UniversalAuditService();

export default universalAuditService;
