import { query } from '../config/database.js';
import emailService from './emailService.js';
import { generateLogId, generateNotificationId } from '../utils/idGenerator.js';
import logger from '../utils/logger.js';

/**
 * Notification Service for Staff Management
 * Handles admin notifications, system alerts, and notification storage
 */

class NotificationService {
  constructor() {
    this.emailService = emailService;
  }

  /**
   * Create a new notification in the database
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        userType,
        title,
        message,
        type = 'info',
        priority = 'medium',
        isRead = false,
        createdBy
      } = notificationData;

      // Generate notification ID
      const notificationId = await generateNotificationId();

      const result = await query(
        `INSERT INTO "Notifications" (
          notification_id, user_id, user_type, title, message, type, priority, is_read, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *`,
        [notificationId, userId, userType, title, message, type, priority, isRead, createdBy]
      );

      logger.debug('Notification created', { notificationId: result.rows[0].notification_id });
      return result.rows[0];

    } catch (error) {
      logger.error('Failed to create notification', { error: error.message, stack: error.stack });
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Send admin notification about staff management actions
   * @param {object} actionData - Action data
   * @returns {Promise<boolean>} Success status
   */
  // OLD METHOD REMOVED: notifyAdminAboutStaffAction
  // Now using the new specific methods like notifyAdminsAboutStaffCreation, notifyAdminsAboutStaffUpdate, etc.

  /**
   * Send welcome notification to new staff member
   * @param {object} staffData - Staff data
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeNotification(staffData) {
    try {
      const {
        lydoId,
        firstName,
        lastName,
        personalEmail,
        orgEmail,
        password,
        createdBy
      } = staffData;

      // Get the User ID from Users table for the new staff member
      const userResult = await query(
        'SELECT user_id FROM "Users" WHERE lydo_id = $1',
        [lydoId]
      );

      let realUserId = null;
      if (userResult.rows.length > 0) {
        realUserId = userResult.rows[0].user_id;
      } else {
        logger.warn('Staff member not found in Users table, creating notification without user_id', { lydoId });
      }

      // Get creator's User ID if available
      let creatorUserId = null;
      if (createdBy && createdBy !== 'SYSTEM' && createdBy !== 'BULK_IMPORT') {
        const creatorResult = await query(
          'SELECT user_id FROM "Users" WHERE lydo_id = $1',
          [createdBy]
        );
        if (creatorResult.rows.length > 0) {
          creatorUserId = creatorResult.rows[0].user_id;
        }
      }

      // Create welcome notification in database
      const notification = await this.createNotification({
        userId: realUserId, // Use correct User ID or null
        userType: 'lydo_staff',
        title: 'Welcome to LYDO Youth Governance',
        message: `Welcome ${firstName} ${lastName}! Your account has been created successfully.`,
        type: 'info', // Use 'info' instead of 'welcome' (schema constraint)
        priority: 'low',
        createdBy: creatorUserId || realUserId || 'USR001' // Fallback to admin
      });

      // Validate personalEmail before sending
      if (!personalEmail || typeof personalEmail !== 'string' || personalEmail.trim() === '') {
        logger.error('Invalid personalEmail for staff member', { 
          firstName, 
          lastName, 
          personalEmail, 
          lydoId,
          orgEmail,
          hasPassword: !!password
        });
      } else {
        // Ensure email service is initialized
        await this.emailService.ready;
        
        // Send welcome email with credentials
        logger.debug('Attempting to send welcome email', { firstName, lastName, personalEmail: personalEmail.trim() });
        const emailSent = await this.emailService.sendWelcomeEmail({
          firstName,
          lastName,
          personalEmail: personalEmail.trim(),
          orgEmail,
          password,
          lydoId
        });

        if (emailSent) {
          logger.info('Welcome email successfully sent', { firstName, lastName, personalEmail: personalEmail.trim() });
        } else {
          logger.warn('Welcome email failed to send', { firstName, lastName, personalEmail: personalEmail.trim() });
        }
      }

      logger.info('Welcome notification sent', { firstName, lastName, lydoId });
      return true;

    } catch (error) {
      logger.error('Failed to send welcome notification', { error: error.message, stack: error.stack, firstName, lastName, lydoId });
      return false;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID marking as read
   * @returns {Promise<boolean>} Success status
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await query(
        'UPDATE "Notifications" SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2',
        [notificationId, userId]
      );

      if (result.rowCount > 0) {
        logger.debug('Notification marked as read', { notificationId, userId });
        return true;
      } else {
        logger.warn('Notification not found or access denied', { notificationId, userId });
        return false;
      }

    } catch (error) {
      logger.error('Failed to mark notification as read', { error: error.message, stack: error.stack, notificationId, userId });
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async markAllAsRead(userId) {
    try {
      const result = await query(
        'UPDATE "Notifications" SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );

      logger.debug('Notifications marked as read', { count: result.rowCount, userId });
      return true;

    } catch (error) {
      logger.error('Failed to mark all notifications as read', { error: error.message, stack: error.stack, userId });
      return false;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} Notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        type = null
      } = options;

      let queryText = `
        SELECT * FROM "Notifications" 
        WHERE user_id = $1
      `;
      
      const queryParams = [userId];
      let paramCount = 1;

      if (unreadOnly) {
        queryText += ` AND is_read = false`;
      }

      if (type) {
        paramCount++;
        queryText += ` AND type = $${paramCount}`;
        queryParams.push(type);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);
      return result.rows;

    } catch (error) {
      logger.error('Failed to get user notifications', { error: error.message, stack: error.stack, userId });
      throw new Error('Failed to get notifications');
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM "Notifications" WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      return parseInt(result.rows[0].count);

    } catch (error) {
      logger.error('Failed to get unread count', { error: error.message, stack: error.stack, userId });
      return 0;
    }
  }

  /**
   * Delete old notifications (cleanup)
   * @param {number} daysOld - Days old to delete
   * @returns {Promise<number>} Number of deleted notifications
   */
  async cleanupOldNotifications(daysOld = 90) {
    try {
      const result = await query(
        'DELETE FROM "Notifications" WHERE created_at < CURRENT_TIMESTAMP - INTERVAL \'1 day\' * $1 AND is_read = true',
        [daysOld]
      );

      logger.info('Cleaned up old notifications', { count: result.rowCount, daysOld });
      return result.rowCount;

    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error: error.message, stack: error.stack, daysOld });
      return 0;
    }
  }

  /**
   * Send system-wide notification
   * @param {object} systemNotification - System notification data
   * @returns {Promise<boolean>} Success status
   */
  async sendSystemNotification(systemNotification) {
    try {
      const {
        title,
        message,
        type = 'info',
        priority = 'medium',
        targetUsers = 'all', // 'all', 'admin', 'lydo_staff', 'sk_official'
        createdBy
      } = systemNotification;

      // Get target users based on criteria
      let userQuery = '';
      let userParams = [];

      switch (targetUsers) {
        case 'admin':
          userQuery = 'SELECT lydo_id as user_id, \'admin\' as user_type FROM "LYDO" WHERE role_id = \'ROL001\'';
          break;
        case 'lydo_staff':
          userQuery = 'SELECT lydo_id as user_id, \'lydo_staff\' as user_type FROM "LYDO" WHERE role_id = \'ROL002\'';
          break;
        case 'sk_official':
          userQuery = 'SELECT sk_id as user_id, \'sk_official\' as user_type FROM "SK_Officials" WHERE is_active = true';
          break;
        default: // 'all'
          userQuery = `
            SELECT lydo_id as user_id, 'admin' as user_type FROM "LYDO" WHERE role_id = 'ROL001'
            UNION ALL
            SELECT lydo_id as user_id, 'lydo_staff' as user_type FROM "LYDO" WHERE role_id = 'ROL002'
            UNION ALL
            SELECT sk_id as user_id, 'sk_official' as user_type FROM "SK_Officials" WHERE is_active = true
          `;
      }

      const usersResult = await query(userQuery, userParams);
      const users = usersResult.rows;

      // Create notifications for all target users
      const notificationPromises = users.map(user => 
        this.createNotification({
          userId: user.user_id,
          userType: user.user_type,
          title,
          message,
          type,
          priority,
          createdBy
        })
      );

      await Promise.all(notificationPromises);
      logger.info('System notification sent', { count: users.length, targetUsers });
      return true;

    } catch (error) {
      logger.error('Failed to send system notification', { error: error.message, stack: error.stack, targetUsers });
      return false;
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @returns {Promise<object>} Statistics
   */
  async getNotificationStats(userId) {
    try {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN type = 'alert' THEN 1 END) as alerts,
          COUNT(CASE WHEN type = 'info' THEN 1 END) as info,
          COUNT(CASE WHEN type = 'welcome' THEN 1 END) as welcome,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
        FROM "Notifications" 
        WHERE user_id = $1
      `, [userId]);

      return statsResult.rows[0];

    } catch (error) {
      logger.error('Failed to get notification stats', { error: error.message, stack: error.stack, userId });
      return {
        total: 0,
        unread: 0,
        alerts: 0,
        info: 0,
        welcome: 0,
        high_priority: 0
      };
    }
  }

  // === SK MANAGEMENT NOTIFICATION METHODS ===

  /**
   * Notify admins about new SK Official creation
   * @param {object} skOfficial - SK Official data
   * @param {object} creator - Creator user data
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutSKCreation(skOfficial, creator) {
    try {
      logger.debug('Notifying admins about SK Official creation', { skId: skOfficial.sk_id, creator: creator?.user_id || creator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      logger.debug('Found admin users for SK creation notification', { count: adminsResult.rows.length });

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK creation notification');
        return false;
      }

      const fullName = `${skOfficial.first_name} ${skOfficial.last_name}`;
      const createdByUserId = creator?.user_id || creator?.id || 'SYSTEM';
      const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'System';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => {
        return this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'New SK Official Created',
          message: `SK Official ${fullName} (${skOfficial.sk_id}) has been created by ${creatorName}. Position: ${skOfficial.position}, Personal Email: ${skOfficial.personal_email}`,
          type: 'info',
          priority: 'normal',
          createdBy: createdByUserId
        });
      });

      await Promise.all(notificationPromises);
      logger.info('SK creation notifications sent to admins', { count: adminsResult.rows.length, skId: skOfficial.sk_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK creation', { error: error.message, stack: error.stack, skId: skOfficial?.sk_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Official updates
   * @param {object} updatedOfficial - Updated SK Official data
   * @param {object} originalOfficial - Original SK Official data
   * @param {object} updater - User who made the update
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutSKUpdate(updatedOfficial, originalOfficial, updater) {
    try {
      logger.debug('Notifying admins about SK Official update', { skId: updatedOfficial.sk_id, updater: updater?.user_id || updater?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK update notification');
        return false;
      }

      const fullName = `${updatedOfficial.first_name} ${updatedOfficial.last_name}`;
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      
      // Identify what changed
      const changes = [];
      if (originalOfficial.first_name !== updatedOfficial.first_name || 
          originalOfficial.last_name !== updatedOfficial.last_name) {
        changes.push('name');
      }
      if (originalOfficial.position !== updatedOfficial.position) {
        changes.push(`position (${originalOfficial.position} → ${updatedOfficial.position})`);
      }
      if (originalOfficial.personal_email !== updatedOfficial.personal_email) {
        changes.push('email');
      }
      if (originalOfficial.barangay_id !== updatedOfficial.barangay_id) {
        changes.push('barangay');
      }

      const changesSummary = changes.length > 0 ? `Changes: ${changes.join(', ')}` : 'Profile updated';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Official Updated',
          message: `SK Official ${fullName} (${updatedOfficial.sk_id}) has been updated by ${updaterName}. ${changesSummary}`,
          type: 'info',
          priority: 'low',
          createdBy: updater?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK update notifications sent to admins', { count: adminsResult.rows.length, skId: updatedOfficial.sk_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK update', { error: error.message, stack: error.stack, skId: updatedOfficial?.sk_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Official deletion
   * @param {object} skOfficial - Deleted SK Official data
   * @param {object} deleter - User who made the deletion
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutSKDeletion(skOfficial, deleter) {
    try {
      logger.debug('Notifying admins about SK Official deletion', { skId: skOfficial.sk_id, deleter: deleter?.user_id || deleter?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK deletion notification');
        return false;
      }

      const fullName = `${skOfficial.first_name} ${skOfficial.last_name}`;
      const deleterName = deleter ? `${deleter.firstName} ${deleter.lastName}` : 'System';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Official Deleted',
          message: `SK Official ${fullName} (${skOfficial.sk_id}) has been deleted by ${deleterName}. Position: ${skOfficial.position}`,
          type: 'warning',
          priority: 'normal',
          createdBy: deleter?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK deletion notifications sent to admins', { count: adminsResult.rows.length, skId: skOfficial.sk_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK deletion', { error: error.message, stack: error.stack, skId: skOfficial?.sk_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Official status changes
   * @param {object} skOfficial - SK Official data
   * @param {string} oldStatus - Previous status
   * @param {object} updater - User who made the change
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutSKStatusChange(skOfficial, oldStatus, updater) {
    try {
      logger.debug('Notifying admins about SK status change', { skId: skOfficial.sk_id, oldStatus, newStatus: skOfficial.status, updater: updater?.user_id || updater?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK status change notification');
        return false;
      }

      const fullName = `${skOfficial.first_name} ${skOfficial.last_name}`;
      const statusAction = skOfficial.status === 'active' ? 'activated' : 'deactivated';
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `SK Official ${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)}`,
          message: `SK Official ${fullName} (${skOfficial.sk_id}) has been ${statusAction} by ${updaterName}. Previous status: ${oldStatus}`,
          type: skOfficial.status === 'active' ? 'success' : 'warning',
          priority: 'low',
          createdBy: updater?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK status change notifications sent to admins', { count: adminsResult.rows.length, skId: skOfficial.sk_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK status change', { error: error.message, stack: error.stack, skId: skOfficial?.sk_id });
      return false;
    }
  }

  /**
   * Send welcome notification to new SK Official (future feature)
   * @param {object} skOfficial - SK Official data
   * @returns {Promise<boolean>} Success status
   */
  async sendSKWelcomeNotification(skOfficial) {
    try {
      logger.debug('Sending welcome notification to SK Official', { skId: skOfficial.sk_id, email: skOfficial.email });

      // Get the User ID from Users table for the SK Official
      const userResult = await query(
        'SELECT user_id FROM "Users" WHERE sk_id = $1',
        [skOfficial.sk_id]
      );

      if (userResult.rows.length === 0) {
        logger.warn('SK Official not found in Users table', { skId: skOfficial.sk_id });
        return false;
      }

      const realUserId = userResult.rows[0].user_id;
      const fullName = `${skOfficial.first_name} ${skOfficial.last_name}`;

      // Create welcome notification
      await this.createNotification({
        userId: realUserId,
        userType: 'sk_official',
        title: 'Welcome to SK Governance',
        message: `Welcome ${fullName}! You have been assigned as ${skOfficial.position}. Your organizational email is ${skOfficial.org_email}`,
        type: 'info',
        priority: 'normal',
        createdBy: 'SYSTEM'
      });

      // Send welcome email with SK-specific credentials
      await this.emailService.sendSKWelcomeEmail(skOfficial);

      logger.info('Welcome notification sent to SK Official', { skId: skOfficial.sk_id, fullName });
      return true;

    } catch (error) {
      logger.error('Failed to send SK welcome notification', { error: error.message, stack: error.stack, skId: skOfficial?.sk_id });
      return false;
    }
  }

  // === SK TERMS NOTIFICATION METHODS ===

  /**
   * Notify admins about new SK Term creation
   * @param {object} term - SK Term data
   * @param {object} creator - Creator user data
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutTermCreation(term, creator) {
    try {
      logger.debug('Notifying admins about SK Term creation', { termId: term.term_id, termName: term.term_name, creator: creator?.user_id || creator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term creation notification');
        return false;
      }

      const statusText = term.status === 'active' ? 'created and activated' : 'created';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'New SK Term Created',
          message: `SK Term "${term.term_name}" (${term.term_id}) has been ${statusText}. Period: ${new Date(term.start_date).toLocaleDateString()} - ${new Date(term.end_date).toLocaleDateString()}`,
          type: 'info',
          priority: term.status === 'active' ? 'high' : 'normal',
          createdBy: creator?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK Term creation notifications sent to admins', { count: adminsResult.rows.length, termId: term.term_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK Term creation', { error: error.message, stack: error.stack, termId: term?.term_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Term updates
   * @param {object} updatedTerm - Updated SK Term data
   * @param {object} originalTerm - Original SK Term data
   * @param {object} updater - User who made the update
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutTermUpdate(updatedTerm, originalTerm, updater) {
    try {
      logger.debug('Notifying admins about SK Term update', { termId: updatedTerm.term_id, updater: updater?.user_id || updater?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term update notification');
        return false;
      }

      // Identify what changed
      const changes = [];
      if (originalTerm.term_name !== updatedTerm.term_name) {
        changes.push(`name (${originalTerm.term_name} → ${updatedTerm.term_name})`);
      }
      if (originalTerm.start_date !== updatedTerm.start_date) {
        changes.push('start date');
      }
      if (originalTerm.end_date !== updatedTerm.end_date) {
        changes.push('end date');
      }
      if (originalTerm.description !== updatedTerm.description) {
        changes.push('description');
      }

      const changesSummary = changes.length > 0 ? `Changes: ${changes.join(', ')}` : 'Term updated';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Term Updated',
          message: `SK Term "${updatedTerm.term_name}" (${updatedTerm.term_id}) has been updated. ${changesSummary}`,
          type: 'info',
          priority: 'low',
          createdBy: updater?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK Term update notifications sent to admins', { count: adminsResult.rows.length, termId: updatedTerm.term_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK Term update', { error: error.message, stack: error.stack, termId: updatedTerm?.term_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Term deletion
   * @param {object} term - Deleted SK Term data
   * @param {object} deleter - User who made the deletion
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutTermDeletion(term, deleter) {
    try {
      logger.debug('Notifying admins about SK Term deletion', { termId: term.term_id, deleter: deleter?.user_id || deleter?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term deletion notification');
        return false;
      }
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Term Deleted',
          message: `SK Term "${term.term_name}" (${term.term_id}) has been deleted from the system.`,
          type: 'warning',
          priority: 'normal',
          createdBy: deleter?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK Term deletion notifications sent to admins', { count: adminsResult.rows.length, termId: term.term_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK Term deletion', { error: error.message, stack: error.stack, termId: term?.term_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Term activation
   * @param {object} term - Activated SK Term data
   * @param {object} activator - User who activated the term
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutTermActivation(term, activator) {
    try {
      logger.debug('Notifying admins about SK Term activation', { termId: term.term_id, activator: activator?.user_id || activator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term deletion notification');
        return false;
      }
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Term Activated',
          message: `SK Term "${term.term_name}" (${term.term_id}) has been activated and is now the current active term.`,
          type: 'success',
          priority: 'high',
          createdBy: activator?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK Term activation notifications sent to admins', { count: adminsResult.rows.length, termId: term.term_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK Term activation', { error: error.message, stack: error.stack, termId: term?.term_id });
      return false;
    }
  }

  /**
   * Notify admins about SK Term deactivation
   * @param {object} term - Deactivated SK Term data
   * @param {object} deactivator - User who deactivated the term
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutTermDeactivation(term, deactivator) {
    try {
      logger.debug('Notifying admins about SK Term deactivation', { termId: term.term_id, deactivator: deactivator?.user_id || deactivator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term deletion notification');
        return false;
      }
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Term Completed',
          message: `SK Term "${term.term_name}" (${term.term_id}) has been marked as completed and is no longer active.`,
          type: 'warning',
          priority: 'normal',
          createdBy: deactivator?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK Term deactivation notifications sent to admins', { count: adminsResult.rows.length, termId: term.term_id });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK Term deactivation', { error: error.message, stack: error.stack, termId: term?.term_id });
      return false;
    }
  }

  // === STAFF MANAGEMENT NOTIFICATION METHODS ===

  /**
   * Notify admins about new Staff creation
   * @param {object} staff - Staff data
   * @param {object} creator - Creator user data
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStaffCreation(staff, creator) {
    try {
      logger.debug('Notifying admins about Staff creation', { staffId: staff.lydoId, creator: creator?.user_id || creator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      logger.debug('Found admin users for Staff creation notification', { count: adminsResult.rows.length });

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK Term deletion notification');
        return false;
      }

      const fullName = `${staff.first_name} ${staff.last_name}`;
      const createdByUserId = creator?.user_id || creator?.id || 'SYSTEM';
      const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'System';
      logger.debug('Creating Staff notification', { createdByUserId, creatorName });
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => {
        return this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'New Staff Member Added',
          message: `Staff member ${fullName} (${staff.lydo_id}) has been created by ${creatorName}. Personal Email: ${staff.personal_email}`,
          type: 'info',
          priority: 'normal',
          createdBy: createdByUserId
        });
      });

      await Promise.all(notificationPromises);
      logger.info('Staff creation notifications sent to admins', { count: adminsResult.rows.length, staffId: staff.lydoId });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about Staff creation', { error: error.message, stack: error.stack, staffId: staff?.lydoId });
      return false;
    }
  }

  /**
   * Notify admins about Staff updates
   * @param {object} updatedStaff - Updated Staff data
   * @param {object} originalStaff - Original Staff data
   * @param {object} updater - User who made the update
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStaffUpdate(updatedStaff, originalStaff, updater) {
    try {
      logger.debug('Notifying admins about Staff update', { staffId: updatedStaff.lydoId, updater: updater?.user_id || updater?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for Staff update notification');
        return false;
      }

      const fullName = `${updatedStaff.first_name} ${updatedStaff.last_name}`;
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      
      // Identify what changed
      const changes = [];
      if (originalStaff.first_name !== updatedStaff.first_name || 
          originalStaff.last_name !== updatedStaff.last_name) {
        changes.push('name');
      }
      if (originalStaff.personal_email !== updatedStaff.personal_email) {
        changes.push('email');
      }
      if (originalStaff.middle_name !== updatedStaff.middle_name) {
        changes.push('middle name');
      }
      if (originalStaff.suffix !== updatedStaff.suffix) {
        changes.push('suffix');
      }

      const changesSummary = changes.length > 0 ? `Changes: ${changes.join(', ')}` : 'Profile updated';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'Staff Profile Updated',
          message: `Staff member ${fullName} (${updatedStaff.lydo_id}) has been updated by ${updaterName}. ${changesSummary}`,
          type: 'info',
          priority: 'normal',
          createdBy: updater?.user_id || updater?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('Staff update notifications sent to admins', { count: adminsResult.rows.length, staffId: updatedStaff.lydoId });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about Staff update', { error: error.message, stack: error.stack, staffId: updatedStaff?.lydoId });
      return false;
    }
  }

  /**
   * Notify admins about Staff status changes
   * @param {object} staff - Staff data
   * @param {string} oldStatus - Previous status
   * @param {object} updater - User who made the change
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStaffStatusChange(staff, oldStatus, updater) {
    try {
      logger.debug('Notifying admins about Staff status change', { staffId: staff.lydoId, oldStatus, newStatus: staff.is_active, updater: updater?.user_id || updater?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for Staff status change notification');
        return false;
      }

      const fullName = `${staff.first_name} ${staff.last_name}`;
      const statusAction = staff.is_active && !staff.deactivated ? 'activated' : 'deactivated';
      const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'System';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: `Staff ${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)}`,
          message: `Staff member ${fullName} (${staff.lydo_id}) has been ${statusAction} by ${updaterName}`,
          type: statusAction === 'activated' ? 'success' : 'warning',
          priority: 'normal',
          createdBy: updater?.user_id || updater?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('Staff status change notifications sent to admins', { count: adminsResult.rows.length, staffId: staff.lydoId });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about Staff status change', { error: error.message, stack: error.stack, staffId: staff?.lydoId });
      return false;
    }
  }

  /**
   * Notify admins about Staff deletion
   * @param {object} staff - Deleted Staff data
   * @param {object} deleter - User who made the deletion
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStaffDeletion(staff, deleter) {
    try {
      logger.debug('Notifying admins about Staff deletion', { staffId: staff.lydoId, deleter: deleter?.user_id || deleter?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for Staff deletion notification');
        return false;
      }

      const fullName = `${staff.first_name} ${staff.last_name}`;
      const deleterName = deleter ? `${deleter.firstName} ${deleter.lastName}` : 'System';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'Staff Member Removed',
          message: `Staff member ${fullName} (${staff.lydo_id}) has been removed by ${deleterName}`,
          type: 'warning',
          priority: 'normal',
          createdBy: deleter?.user_id || deleter?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('Staff deletion notifications sent to admins', { count: adminsResult.rows.length, staffId: staff.lydoId });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about Staff deletion', { error: error.message, stack: error.stack, staffId: staff?.lydoId });
      return false;
    }
  }

  /**
   * Notify admins about bulk Staff operations
   * @param {array} staffIds - Array of staff LYDO IDs
   * @param {string} action - Action performed (activate/deactivate)
   * @param {object} operator - User who performed the bulk operation
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutBulkStaffOperation(staffIds, action, operator) {
    try {
      logger.debug('Notifying admins about bulk Staff operation', { action, count: staffIds.length, operator: operator?.user_id || operator?.id });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for bulk Staff operation notification');
        return false;
      }

      const operatorName = operator ? `${operator.firstName} ${operator.lastName}` : 'System';
      const actionText = action === 'activate' ? 'activated' : 'deactivated';
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'Bulk Staff Operation Completed',
          message: `${staffIds.length} staff members have been ${actionText} by ${operatorName}`,
          type: 'info',
          priority: 'normal',
          createdBy: operator?.user_id || operator?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('Bulk Staff operation notifications sent to admins', { count: adminsResult.rows.length, action, staffCount: staffIds.length });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about bulk Staff operation', { error: error.message, stack: error.stack, action, staffCount: staffIds?.length });
      return false;
    }
  }

  /**
   * Notify admins about Staff bulk import
   * @param {object} importSummary - Import summary data
   * @param {object} importer - User who performed the import
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutStaffBulkImport(importSummary, importer) {
    try {
      logger.debug('Notifying admins about Staff bulk import', { importer: importer?.user_id || importer?.id, fileName: importSummary?.fileName, totalRows: importSummary?.totalRows });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for Staff bulk import notification');
        return false;
      }

      const importerName = importer ? `${importer.firstName} ${importer.lastName}` : 'System';
      const { totalRows, validRecords, importedRecords, errors, fileName } = importSummary;
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'Staff Bulk Import Completed',
          message: `${importedRecords} staff members imported successfully by ${importerName} from ${fileName || 'uploaded file'}. Total processed: ${totalRows}, Valid: ${validRecords}, Errors: ${errors}`,
          type: 'success',
          priority: 'normal',
          createdBy: importer?.user_id || importer?.id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('Staff bulk import notifications sent to admins', { count: adminsResult.rows.length, importedRecords, totalRows, errors, fileName });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about Staff bulk import', { error: error.message, stack: error.stack, fileName: importSummary?.fileName });
      return false;
    }
  }

  /**
   * Notify admins about SK Officials bulk import completion
   * @param {object} results - Import results
   * @param {object} importer - User who performed the import
   * @returns {Promise<boolean>} Success status
   */
  async notifyAdminsAboutSKBulkImport(results, importer) {
    try {
      logger.debug('Notifying admins about SK bulk import', { importer: importer?.user_id || importer?.id, summary: results.summary });

      // Get all admin users
      const adminsResult = await query(
        `SELECT u.user_id, l.personal_email, l.email 
         FROM "Users" u
         JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         WHERE u.user_type = 'admin'`
      );

      if (adminsResult.rows.length === 0) {
        logger.warn('No admin users found for SK bulk import notification');
        return false;
      }

      const importerName = importer ? `${importer.firstName} ${importer.lastName}` : 'System';
      const { totalRows, importedRecords, errors } = results.summary;
      
      // Create notifications for each admin
      const notificationPromises = adminsResult.rows.map(admin => 
        this.createNotification({
          userId: admin.user_id,
          userType: 'admin',
          title: 'SK Officials Bulk Import Completed',
          message: `Bulk import completed by ${importerName}: ${importedRecords} SK Officials imported successfully out of ${totalRows} records (${errors} errors)`,
          type: importedRecords > 0 ? 'success' : 'warning',
          priority: 'normal',
          createdBy: importer?.user_id || 'SYSTEM'
        })
      );

      await Promise.all(notificationPromises);
      logger.info('SK bulk import notifications sent to admins', { count: adminsResult.rows.length, importedRecords: results.summary?.importedRecords, totalRows: results.summary?.totalRows, errors: results.summary?.errors });
      return true;

    } catch (error) {
      logger.error('Failed to notify admins about SK bulk import', { error: error.message, stack: error.stack, summary: results?.summary });
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

