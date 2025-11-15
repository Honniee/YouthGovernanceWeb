import { query } from '../config/database.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Universal Notification Service
 * Provides standardized admin notifications for all management systems
 * Following exact Staff Management patterns for consistency
 */
class UniversalNotificationService {
  constructor() {
    this.baseNotificationService = notificationService;
    
    // Entity configurations for notification formatting
    this.entityConfigs = {
      'staff': {
        displayName: 'Staff Member',
        displayNamePlural: 'Staff Members',
        nameTemplate: (data) => `${data.firstName} ${data.lastName} (${data.lydoId})`,
        emailField: 'personalEmail'
      },
      'sk-officials': {
        displayName: 'SK Official',
        displayNamePlural: 'SK Officials',
        nameTemplate: (data) => `${data.firstName} ${data.lastName} (${data.position}) - ${data.skId}`,
        emailField: 'personalEmail'
      },
      'sk-terms': {
        displayName: 'SK Term',
        displayNamePlural: 'SK Terms',
        nameTemplate: (data) => `${data.termName} (${data.termId})`,
        emailField: null
      },
      'surveys': {
        displayName: 'Survey',
        displayNamePlural: 'Surveys',
        nameTemplate: (data) => `${data.title} (${data.surveyId})`,
        emailField: null
      },
      'announcements': {
        displayName: 'Announcement',
        displayNamePlural: 'Announcements',
        nameTemplate: (data) => `${data.title} (${data.announcementId})`,
        emailField: null
      },
      'reports': {
        displayName: 'Report',
        displayNamePlural: 'Reports',
        nameTemplate: (data) => `${data.reportType} — ${data.recordCount} records`,
        emailField: null
      },
      'voters': {
        displayName: 'Voter',
        displayNamePlural: 'Voters',
        nameTemplate: (data) => `${(data.firstName || data.first_name || '').trim()} ${(data.lastName || data.last_name || '').trim()}`.trim(),
        emailField: null
      }
    };
  }

  /**
   * Notify admins about entity creation - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity ('staff', 'sk-officials', 'sk-terms', etc.)
   * @param {object} entityData - Entity data
   * @param {object} creator - User who created the entity
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutCreation(entityType, entityData, creator) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return false;
      }

      logger.debug(`Notifying admins about ${config.displayName} creation`, { entityData, creator });

      // Follow exact Staff Management admin query pattern
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      logger.debug(`Found ${adminsResult.rows.length} admin users`, { adminIds: adminsResult.rows.map(admin => admin.user_id) });

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found');
        return false;
      }

      const entityName = config.nameTemplate(entityData);
      const createdByUserId = creator?.user_id || creator?.id || 'SYSTEM';
      const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'System';
      
      logger.debug('Using createdBy', { createdByUserId, creatorName });
      
      // Create notifications for each admin - exact Staff Management pattern
      const notificationPromises = adminsResult.rows.map(admin => {
        logger.debug(`Creating notification for admin: ${admin.user_id}`);
        return this.baseNotificationService.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `New ${config.displayName} Added`,
          message: this.buildCreationMessage(entityType, entityData, creatorName, config),
          type: 'info',
          priority: 'normal',
          createdBy: createdByUserId
        });
      });

      await Promise.all(notificationPromises);
      logger.info(`${config.displayName} creation notifications sent to ${adminsResult.rows.length} admins`, { entityType, adminCount: adminsResult.rows.length });
      return true;

    } catch (error) {
      logger.error(`Failed to notify admins about ${entityType} creation`, { error: error.message, stack: error.stack, entityType });
      return false;
    }
  }

  /**
   * Notify admins about entity updates - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {object} updatedData - Updated entity data
   * @param {object} originalData - Original entity data (for change detection)
   * @param {object} updater - User who made the update
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutUpdate(entityType, updatedData, originalData, updater) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return false;
      }

      logger.debug(`Notifying admins about ${config.displayName} update`, { updatedData });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found');
        return false;
      }

      const entityName = config.nameTemplate(updatedData);
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      
      // Identify changes (basic implementation)
      const changesSummary = this.detectChanges(entityType, originalData, updatedData);
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.baseNotificationService.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `${config.displayName} Updated`,
          message: `${config.displayName} ${entityName} has been updated by ${updaterName}. ${changesSummary}`,
          type: 'info',
          priority: 'normal',
          createdBy: updater?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`${config.displayName} update notifications sent to ${adminsResult.rows.length} admins`, { entityType, adminCount: adminsResult.rows.length });
      return true;

    } catch (error) {
      logger.error(`Failed to notify admins about ${entityType} update`, { error: error.message, stack: error.stack, entityType });
      return false;
    }
  }

  /**
   * Notify admins about status changes - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {object} entityData - Entity data
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {object} updater - User who made the change
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStatusChange(entityType, entityData, oldStatus, newStatus, updater) {
    try {
      logger.debug(`notifyAdminsAboutStatusChange called`, {
        entityType,
        oldStatus,
        newStatus,
        updater: updater ? { id: updater.user_id || updater.id, name: `${updater.firstName} ${updater.lastName}` } : null
      });
      
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return false;
      }

      logger.debug(`Notifying admins about ${config.displayName} status change`, { oldStatus, newStatus });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found');
        return false;
      }

      const entityName = config.nameTemplate(entityData);
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      const statusChangeText = this.formatStatusChange(oldStatus, newStatus);
      
      logger.debug('Status change details', {
        entityName,
        updaterName,
        statusChangeText,
        adminCount: adminsResult.rows.length
      });
      
      const notificationPromises = adminsResult.rows.map(admin => {
        const notificationData = {
          userId: admin.user_id,
          userType: 'admin',
          title: `${config.displayName} Status Changed`,
          message: `${config.displayName} ${entityName} has been ${statusChangeText} by ${updaterName}`,
          type: newStatus === 'active' ? 'success' : 'warning',
          priority: 'normal',
          createdBy: updater?.id || 'SYSTEM'
        };
        logger.debug(`Creating notification for admin ${admin.user_id}`, { notificationData });
        return this.baseNotificationService.createNotification(notificationData);
      });

      await Promise.all(notificationPromises);
      logger.info(`${config.displayName} status change notifications sent to ${adminsResult.rows.length} admins`, { entityType, adminCount: adminsResult.rows.length });
      
      // Debug: Check if notifications were actually created in database
      try {
        const checkNotificationsQuery = `
          SELECT notification_id, user_id, title, message, created_at 
          FROM "Notifications" 
          WHERE created_at > NOW() - INTERVAL '5 minutes'
          ORDER BY created_at DESC 
          LIMIT 5
        `;
        const checkResult = await query(checkNotificationsQuery);
        logger.debug('Recent notifications in database', { notifications: checkResult.rows });
      } catch (checkError) {
        logger.error('Error checking notifications in database', { error: checkError.message, stack: checkError.stack });
      }
      
      return true;

    } catch (error) {
      logger.error(`Failed to notify admins about ${entityType} status change`, { error: error.message, stack: error.stack, entityType });
      return false;
    }
  }

  /**
   * Notify admins about bulk operations - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {string} operation - Operation type ('activate', 'deactivate', 'delete')
   * @param {Array} entityIds - Array of entity IDs
   * @param {object} executor - User who performed the operation
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutBulkOperation(entityType, operation, entityIds, executor) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return false;
      }

      logger.debug(`Notifying admins about bulk ${operation} operation on ${entityType}`, { entityIds: entityIds.length });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found');
        return false;
      }

      const executorName = executor ? `${executor.firstName} ${executor.lastName}` : 'System';
      const operationText = operation.charAt(0).toUpperCase() + operation.slice(1);
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.baseNotificationService.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `Bulk ${config.displayName} Operation`,
          message: `Bulk ${operation} operation completed by ${executorName}: ${entityIds.length} ${config.displayNamePlural} processed`,
          type: 'info',
          priority: 'normal',
          createdBy: executor?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`Bulk ${operation} notifications sent to ${adminsResult.rows.length} admins`, { entityType, operation, adminCount: adminsResult.rows.length });
      return true;

    } catch (error) {
      logger.error(`Failed to notify admins about bulk ${operation}`, { error: error.message, stack: error.stack, entityType, operation });
      return false;
    }
  }

  /**
   * Notify admins about bulk import - Following exact Staff Management pattern
   * @param {string} entityType - Type of entity
   * @param {object} importSummary - Import summary (totalRows, importedRecords, errors)
   * @param {object} importer - User who performed the import
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutBulkImport(entityType, importSummary, importer) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        logger.error(`Unknown entity type: ${entityType}`);
        return false;
      }

      logger.debug(`Notifying admins about ${entityType} bulk import`, { importSummary });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for bulk import notification');
        return false;
      }

      const importerName = importer ? `${importer.firstName} ${importer.lastName}` : 'System';
      const { totalRows, importedRecords, errors } = importSummary;
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.baseNotificationService.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `${config.displayNamePlural} Bulk Import Completed`,
          message: `Bulk import completed by ${importerName}: ${importedRecords} ${config.displayNamePlural} imported successfully out of ${totalRows} records (${errors} errors)`,
          type: importedRecords > 0 ? 'success' : 'warning',
          priority: 'normal',
          createdBy: importer?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info(`${entityType} bulk import notifications sent to ${adminsResult.rows.length} admins`, { entityType, adminCount: adminsResult.rows.length, importedRecords, totalRows, errors });
      return true;

    } catch (error) {
      logger.error(`Failed to notify admins about ${entityType} bulk import`, { error: error.message, stack: error.stack, entityType });
      return false;
    }
  }

  /**
   * Send notification with async pattern (exact Staff Management pattern)
   * @param {string} entityType - Type of entity
   * @param {string} notificationType - Type of notification ('creation', 'update', 'status', etc.)
   * @param {object} entityData - Entity data
   * @param {object} user - User context
   * @param {object} extraData - Additional data for specific notification types
   */
  async sendNotificationAsync(entityType, notificationType, entityData, user, extraData = {}) {
    logger.debug(`sendNotificationAsync called`, {
      entityType,
      notificationType,
      entityData,
      user,
      extraData
    });
    
    // Follow exact Staff Management async pattern with setTimeout
    const currentUser = user;
    setTimeout(async () => {
      try {
        logger.debug(`Processing ${entityType} ${notificationType} notification with user context`, { currentUser, extraData });
        
        switch (notificationType) {
          case 'creation':
            logger.debug(`Calling notifyAdminsAboutCreation for ${entityType}`);
            await this.notifyAdminsAboutCreation(entityType, entityData, currentUser);
            break;
          case 'update':
            logger.debug(`Calling notifyAdminsAboutUpdate for ${entityType}`);
            await this.notifyAdminsAboutUpdate(entityType, entityData, extraData.originalData, currentUser);
            break;
          case 'status':
            logger.debug(`Calling notifyAdminsAboutStatusChange for ${entityType}`, { statusChange: `${extraData.oldStatus} → ${extraData.newStatus}` });
            await this.notifyAdminsAboutStatusChange(entityType, entityData, extraData.oldStatus, extraData.newStatus, currentUser);
            break;
          case 'bulk':
            logger.debug(`Calling notifyAdminsAboutBulkOperation for ${entityType}`);
            await this.notifyAdminsAboutBulkOperation(entityType, extraData.operation, extraData.entityIds, currentUser);
            break;
          case 'import':
            logger.debug(`Calling notifyAdminsAboutBulkImport for ${entityType}`);
            await this.notifyAdminsAboutBulkImport(entityType, extraData.importSummary, currentUser);
            break;
          default:
            logger.error(`Unknown notification type: ${notificationType}`, { entityType, notificationType });
        }
        logger.debug(`${entityType} ${notificationType} notification processed successfully`);
      } catch (notifError) {
        logger.error(`${entityType} ${notificationType} notification error`, { error: notifError.message, stack: notifError.stack, entityType, notificationType });
      }
    }, 100);
  }

  // Helper methods

  /**
   * Build creation message specific to entity type
   */
  buildCreationMessage(entityType, entityData, creatorName, config) {
    const entityName = config.nameTemplate(entityData);
    
    switch (entityType) {
      case 'staff':
        return `Staff member ${entityName} has been created by ${creatorName}. Personal Email: ${entityData.personalEmail}`;
      case 'sk-officials':
        return `SK Official ${entityName} has been created by ${creatorName} for ${entityData.barangayName || 'selected barangay'}`;
      case 'sk-terms':
        return `SK Term ${entityName} has been created by ${creatorName}. Duration: ${entityData.startDate} to ${entityData.endDate}`;
      case 'reports': {
        // Desired format:
        // Report <reportType> (<recordCount> records) has been created by <creatorName>
        const reportType = entityData.reportType || 'Report';
        const recordCount = typeof entityData.recordCount === 'number' ? entityData.recordCount : 0;
        return `Report ${reportType} (${recordCount} records) has been created by ${creatorName}`;
      }
      default:
        return `${config.displayName} ${entityName} has been created by ${creatorName}`;
    }
  }

  /**
   * Detect changes between old and new data
   */
  detectChanges(entityType, originalData, updatedData) {
    // Basic change detection - can be enhanced per entity type
    const changes = [];
    
    if (originalData && updatedData) {
      const fieldsToCheck = ['firstName', 'lastName', 'middleName', 'suffix', 'personalEmail', 'position', 'termName', 'title'];
      
      fieldsToCheck.forEach(field => {
        if (originalData[field] !== updatedData[field]) {
          changes.push(field);
        }
      });
    }
    
    return changes.length > 0 ? `Changes: ${changes.join(', ')}` : 'Profile updated';
  }

  /**
   * Format status change text
   */
  formatStatusChange(oldStatus, newStatus) {
    if (newStatus === 'active') {
      return 'activated';
    } else if (newStatus === 'inactive' || newStatus === 'deactivated') {
      return 'deactivated';
    } else if (newStatus === 'completed') {
      return 'completed';
    } else if (newStatus === 'deleted') {
      return 'deleted';
    } else {
      return `changed from ${oldStatus} to ${newStatus}`;
    }
  }

  /**
   * Get entity configuration
   */
  getEntityConfig(entityType) {
    return this.entityConfigs[entityType] || null;
  }

  /**
   * Add new entity type configuration
   */
  addEntityType(entityType, config) {
    this.entityConfigs[entityType] = {
      displayName: config.displayName,
      displayNamePlural: config.displayNamePlural,
      nameTemplate: config.nameTemplate,
      emailField: config.emailField || null
    };
  }
}

// Create singleton instance
const universalNotificationService = new UniversalNotificationService();

export default universalNotificationService;
