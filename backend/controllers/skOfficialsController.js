import { query, getClient } from '../config/database.js';
import { generateSKId } from '../utils/idGenerator.js';
import { generateSKOrgEmail } from '../utils/emailGenerator.js';
import { generateSecurePassword } from '../utils/passwordGenerator.js';
import { sanitizeInput } from '../utils/validation.js';
import bcrypt from 'bcryptjs';
import notificationService from '../services/notificationService.js';
import universalNotificationService from '../services/universalNotificationService.js';
import { createUserForSK } from '../utils/usersTableHelper.js';
import { 
  validateSKCreation,
  validateSKStatusUpdate,
  validateSKSearchParams,
  validateBarangayExists,
  getActiveTerm,
  checkPositionConflict 
} from '../utils/skValidation.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import SKValidationService from '../services/skValidationService.js';
import logger from '../utils/logger.js';

/**
 * SK Officials Core Controller
 * Handles CRUD operations for SK Officials
 * Following Staff Management architecture pattern - Separated Concerns
 */

// Simple string sanitizer for individual fields
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
};

// === LIST & SEARCH OPERATIONS ===

/**
 * Get all SK Officials with pagination, filtering, and search
 * GET /api/sk-officials
 */
const getAllSKOfficials = async (req, res) => {
  logger.debug('getAllSKOfficials controller called', { userId: req.user?.id });
  try {
    // Extract and validate query parameters
    const {
      page = 1,
      limit = 10,
      q: search = '',
      status = 'all',
      position = '',
      barangay = '',
      termId = '',
      sortBy = 'last_name',
      sortOrder = 'asc'
    } = req.query;

    logger.debug('SK Officials query parameters', {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      position,
      barangay,
      termId,
      sortBy,
      sortOrder
    });

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // If termId is provided, filter by specific term
    if (termId) {
      paramCount++;
      whereConditions.push(`sk.term_id = $${paramCount}`);
      queryParams.push(termId);
      logger.debug('Filtering by termId', { termId });
    } else {
      // Default to active term if no specific term requested
      whereConditions.push(`t.status = 'active'`);
      logger.debug('Filtering by active term status');
    }

    // Search functionality
    if (search && search.trim()) {
      paramCount++;
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(
        LOWER(sk.first_name) LIKE LOWER($${paramCount}) OR
        LOWER(sk.last_name) LIKE LOWER($${paramCount}) OR
        LOWER(sk.middle_name) LIKE LOWER($${paramCount}) OR
        LOWER(sk.email) LIKE LOWER($${paramCount}) OR
        LOWER(sk.personal_email) LIKE LOWER($${paramCount}) OR
        LOWER(sk.position) LIKE LOWER($${paramCount}) OR
        LOWER(b.barangay_name) LIKE LOWER($${paramCount})
      )`);
      queryParams.push(searchTerm);
    }

    // Status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        whereConditions.push(`sk.is_active = true`);
      } else if (status === 'inactive') {
        whereConditions.push(`sk.is_active = false`);
      }
    }

    // Position filter
    if (position) {
      paramCount++;
      whereConditions.push(`sk.position = $${paramCount}`);
      queryParams.push(position);
    }

    // Barangay filter
    if (barangay) {
      paramCount++;
      whereConditions.push(`sk.barangay_id = $${paramCount}`);
      queryParams.push(barangay);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const validSortBy = ['last_name', 'first_name', 'email', 'position', 'created_at', 'is_active', 'full_name'].includes(sortBy) ? sortBy : 'last_name';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Main query to get SK officials
    const mainQuery = `
      SELECT 
        sk.sk_id,
        sk.role_id,
        sk.term_id,
        sk.email,
        sk.personal_email,
        sk.barangay_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.profile_picture,
        sk.is_active,
        sk.email_verified,
        sk.created_by,
        sk.created_at,
        sk.updated_at,
        b.barangay_name,
        t.term_name,
        prof.age,
        prof.gender,
        prof.contact_number,
        prof.school_or_company,
        CONCAT(sk.first_name, ' ', COALESCE(sk.middle_name, ''), ' ', sk.last_name, ' ', COALESCE(sk.suffix, '')) as full_name
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      LEFT JOIN "SK_Officials_Profiling" prof ON prof.sk_id = sk.sk_id
      ${whereClause}
      ORDER BY ${validSortBy === 'full_name' ? 'sk.last_name, sk.first_name' : `sk.${validSortBy}`} ${validSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      ${whereClause}
    `;

    logger.debug('Executing SK Officials queries', { hasWhereConditions: whereConditions.length > 0, paramCount: queryParams.length });
    
    // Execute both queries
    const [dataResult, countResult] = await Promise.all([
      query(mainQuery, queryParams),
      query(countQuery, queryParams.slice(0, paramCount))
    ]);

    const items = dataResult.rows.map(row => ({
      skId: row.sk_id,
      roleId: row.role_id,
      termId: row.term_id,
      email: row.email,
      personalEmail: row.personal_email,
      barangayId: row.barangay_id,
      firstName: row.first_name,
      lastName: row.last_name,
      middleName: row.middle_name,
      suffix: row.suffix,
      position: row.position,
      profilePicture: row.profile_picture,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      barangayName: row.barangay_name,
      termName: row.term_name,
      age: row.age,
      gender: row.gender,
      contactNumber: row.contact_number,
      schoolOrCompany: row.school_or_company,
      fullName: row.full_name
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    logger.debug('SK Officials query completed', { count: items.length, total, page, limit });

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching SK officials', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK officials',
      error: error.message
    });
  }
};

/**
 * Search SK Officials (redirect to getAllSKOfficials)
 * GET /api/sk-officials/search
 */
const searchSKOfficials = async (req, res) => {
  return getAllSKOfficials(req, res);
};

/**
 * Get SK Officials statistics
 * GET /api/sk-officials/statistics
 */
const getSKStatistics = async (req, res) => {
  try {
    // Get basic statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN sk.is_active = false THEN 1 END) as inactive,
        COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Treasurer' THEN 1 END) as treasurers,
        COUNT(CASE WHEN sk.is_active = true AND sk.position = 'SK Councilor' THEN 1 END) as councilors
      FROM "SK_Officials" sk
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      WHERE t.status = 'active'
    `;
    
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    // Get barangay statistics
    const barangayQuery = `
      SELECT 
        b.barangay_name,
        COUNT(sk.sk_id) as count
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id 
      LEFT JOIN "SK_Terms" t ON sk.term_id = t.term_id AND t.status = 'active'
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY count DESC, b.barangay_name ASC
    `;
    
    const barangayResult = await query(barangayQuery);
    const byBarangay = {};
    barangayResult.rows.forEach(row => {
      byBarangay[row.barangay_name] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: parseInt(stats.inactive),
        byPosition: {
          chairpersons: parseInt(stats.chairpersons),
          secretaries: parseInt(stats.secretaries),
          treasurers: parseInt(stats.treasurers),
          councilors: parseInt(stats.councilors)
        },
        byBarangay
      }
    });

  } catch (error) {
    logger.error('Error fetching SK statistics', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK statistics',
      error: error.message
    });
  }
};

// === INDIVIDUAL SK OFFICIAL OPERATIONS ===

/**
 * Get specific SK Official by ID
 * GET /api/sk-officials/:id
 */
const getSKOfficialById = async (req, res) => {
  try {
    const { id } = req.params;

    const skQuery = `
      SELECT 
        sk.*,
        b.barangay_name,
        t.term_name,
        t.start_date as term_start_date,
        t.end_date as term_end_date,
        t.status as term_status,
        prof.age,
        prof.gender,
        prof.contact_number,
        prof.school_or_company
      FROM "SK_Officials" sk
      LEFT JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Terms" t ON sk.term_id = t.term_id
      LEFT JOIN "SK_Officials_Profiling" prof ON prof.sk_id = sk.sk_id
      WHERE sk.sk_id = $1
    `;

    const result = await query(skQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SK Official not found'
      });
    }

    const official = result.rows[0];
    
    res.json({
      success: true,
      data: {
        skId: official.sk_id,
        roleId: official.role_id,
        termId: official.term_id,
        firstName: official.first_name,
        lastName: official.last_name,
        middleName: official.middle_name,
        suffix: official.suffix,
        position: official.position,
        barangayId: official.barangay_id,
        barangayName: official.barangay_name,
        personalEmail: official.personal_email,
        email: official.email,
        isActive: official.is_active,
        emailVerified: official.email_verified,
        profilePicture: official.profile_picture,
        createdBy: official.created_by,
        createdAt: official.created_at,
        updatedAt: official.updated_at,
        termName: official.term_name,
        termStartDate: official.term_start_date,
        termEndDate: official.term_end_date,
        termStatus: official.term_status,
        age: official.age,
        gender: official.gender,
        contactNumber: official.contact_number,
        schoolOrCompany: official.school_or_company
      }
    });

  } catch (error) {
    logger.error('Error fetching SK official', { error: error.message, stack: error.stack, skId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK official',
      error: error.message
    });
  }
};

/**
 * Create new SK Official
 * POST /api/sk-officials
 */
const createSKOfficial = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Validate input data
    const validation = validateSKCreation(req.body);
    if (!validation.isValid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const {
      firstName,
      lastName,
      middleName = '',
      suffix = '',
      position,
      barangayId,
      personalEmail
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      middleName: sanitizeString(middleName || ''),
      suffix: sanitizeString(suffix || ''),
      position: sanitizeString(position),
      personalEmail: sanitizeString(personalEmail).toLowerCase()
    };

    // Verify barangay exists
    const barangayCheck = await validateBarangayExists(barangayId, client);
    if (!barangayCheck.exists) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid barangay ID'
      });
    }

    // Get active term
    const activeTerm = await getActiveTerm(client);
    if (!activeTerm) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No active SK term found. Please create an active term first.'
      });
    }

    // Validate position availability using new validation service
    const positionValidation = await SKValidationService.validatePositionAvailability(
      barangayId, 
      activeTerm.term_id, 
      sanitizedData.position
    );
    
    if (!positionValidation.isValid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot create ${sanitizedData.position}. Maximum limit (${positionValidation.maxAllowed}) already reached for this barangay.`,
        details: {
          currentCount: positionValidation.currentCount,
          maxAllowed: positionValidation.maxAllowed,
          availableSlots: positionValidation.availableSlots,
          position: sanitizedData.position,
          barangayId: barangayId
        }
      });
    }

    // Check if personal email already exists
    const emailCheckQuery = `
      SELECT sk_id FROM "SK_Officials" WHERE personal_email = $1
      UNION
      SELECT lydo_id FROM "LYDO" WHERE personal_email = $1
    `;
    const emailCheck = await client.query(emailCheckQuery, [sanitizedData.personalEmail]);
    
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Personal email already exists in the system'
      });
    }

    // Generate SK ID and organizational email
    const skId = await generateSKId(client);
    const orgEmail = await generateSKOrgEmail(
      sanitizedData.firstName,
      sanitizedData.lastName,
      barangayCheck.barangayName,
      client
    );

    // Generate password for SK Official
    const password = await generateSecurePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert SK Official
    const insertQuery = `
      INSERT INTO "SK_Officials" (
        sk_id, role_id, first_name, last_name, middle_name, suffix, 
        position, barangay_id, term_id, personal_email, email, password_hash,
        is_active, email_verified, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const insertValues = [
      skId,
      'ROL003', // SK Official role
      sanitizedData.firstName,
      sanitizedData.lastName,
      sanitizedData.middleName,
      sanitizedData.suffix,
      sanitizedData.position,
      barangayId,
      activeTerm.term_id,
      sanitizedData.personalEmail,
      orgEmail,
      passwordHash,
      true, // is_active
      false, // email_verified
      req.user?.id || null // created_by
    ];

    const result = await client.query(insertQuery, insertValues);
    const newOfficial = result.rows[0];

    // Create Users table entry
    await createUserForSK(skId, client);

    await client.query('COMMIT');
    logger.debug('SK Official creation - Database transaction committed successfully', { skId, orgEmail });

    // Send welcome notification to SK Official (fire-and-forget)
    notificationService.sendSKWelcomeNotification({
      sk_id: newOfficial.sk_id,
      first_name: newOfficial.first_name,
      last_name: newOfficial.last_name,
      personal_email: newOfficial.personal_email,
      org_email: newOfficial.email,
      position: newOfficial.position,
      password: password,
      barangay_name: barangayCheck.barangayName
    }).catch(err => logger.error('SK welcome notification failed', { error: err.message, stack: err.stack, skId }));

    // Create audit log for SK Official creation
    const skOfficialName = `${newOfficial.first_name} ${newOfficial.last_name}`;
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Create',
      resource: '/api/sk-officials',
      resourceId: newOfficial.sk_id,
      resourceName: skOfficialName,
      details: {
        skName: skOfficialName,
        resourceType: 'sk-officials',
        position: newOfficial.position,
        barangayName: barangayCheck.barangayName,
        personalEmail: newOfficial.personal_email
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'CREATE', resourceType: 'sk-officials' }));

    // Send admin notifications using Universal Notification Service (defensive programming)
    logger.debug('SK Official creation - Starting admin notifications', { skId });
    try {
      universalNotificationService.sendNotificationAsync('sk-officials', 'creation', {
        skId: newOfficial.sk_id,
        firstName: newOfficial.first_name,
        lastName: newOfficial.last_name,
        position: newOfficial.position,
        barangayName: barangayCheck.barangayName,
        personalEmail: newOfficial.personal_email
      }, req.user);
      logger.debug('SK Official creation - Admin notifications queued successfully', { skId });
    } catch (notifError) {
      logger.error('Universal notification service error', { error: notifError.message, stack: notifError.stack, skId });
    }

    res.status(201).json({
      success: true,
      message: 'SK Official created successfully',
      data: {
        skOfficial: {
          skId: newOfficial.sk_id,
          firstName: newOfficial.first_name,
          lastName: newOfficial.last_name,
          middleName: newOfficial.middle_name,
          suffix: newOfficial.suffix,
          position: newOfficial.position,
          barangayName: barangayCheck.barangayName,
          personalEmail: newOfficial.personal_email,
          email: newOfficial.email,
          isActive: newOfficial.is_active
        },
        credentials: {
          skId: newOfficial.sk_id,
          orgEmail: newOfficial.email,
          password: password
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating SK official', { error: error.message, stack: error.stack });
    
    // Create audit log for failed creation
    const resourceName = `SK Official Creation - Failed`;
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Create',
      resource: '/api/sk-officials',
      resourceId: null,
      resourceName: resourceName,
      details: {
        resourceType: 'sk-officials',
        error: error.message,
        createFailed: true
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'error',
      errorMessage: error.message
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'sk-officials' }));

    res.status(500).json({
      success: false,
      message: 'Failed to create SK official',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update SK Official
 * PUT /api/sk-officials/:id
 */
const updateSKOfficial = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if SK Official exists
    const existingQuery = `SELECT * FROM "SK_Officials" WHERE sk_id = $1`;
    const existingResult = await client.query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Official not found'
      });
    }

    const existingOfficial = existingResult.rows[0];

    // Extract and sanitize updatable fields
    const {
      firstName,
      lastName,
      middleName,
      suffix,
      personalEmail
    } = req.body;

    const sanitizedData = {
      firstName: sanitizeString(firstName) || existingOfficial.first_name,
      lastName: sanitizeString(lastName) || existingOfficial.last_name,
      middleName: sanitizeString(middleName || '') || existingOfficial.middle_name,
      suffix: sanitizeString(suffix || '') || existingOfficial.suffix,
      personalEmail: sanitizeString(personalEmail || '').toLowerCase() || existingOfficial.personal_email
    };

    // Check if personal email is being changed and if it already exists
    if (sanitizedData.personalEmail !== existingOfficial.personal_email) {
      const emailCheckQuery = `
        SELECT sk_id FROM "SK_Officials" WHERE personal_email = $1 AND sk_id != $2
        UNION
        SELECT lydo_id FROM "LYDO" WHERE personal_email = $1
      `;
      const emailCheck = await client.query(emailCheckQuery, [sanitizedData.personalEmail, id]);
      
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Personal email already exists in the system'
        });
      }
    }

    // Update SK Official
    const updateQuery = `
      UPDATE "SK_Officials" 
      SET 
        first_name = $1,
        last_name = $2,
        middle_name = $3,
        suffix = $4,
        personal_email = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $6
      RETURNING *
    `;

    const updateValues = [
      sanitizedData.firstName,
      sanitizedData.lastName,
      sanitizedData.middleName,
      sanitizedData.suffix,
      sanitizedData.personalEmail,
      id
    ];

    const result = await client.query(updateQuery, updateValues);
    const updatedOfficial = result.rows[0];

    await client.query('COMMIT');

    // Create audit log for SK Official update
    const updatedSKName = `${updatedOfficial.first_name} ${updatedOfficial.last_name}`;
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Update',
      resource: '/api/sk-officials',
      resourceId: id,
      resourceName: updatedSKName,
      details: {
        skName: updatedSKName,
        resourceType: 'sk-officials',
        position: existingOfficial.position,
        personalEmail: updatedOfficial.personal_email
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'sk-officials' }));

    // Send admin notifications using Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-officials', 'update', {
      skId: updatedOfficial.sk_id,
      firstName: updatedOfficial.first_name,
      lastName: updatedOfficial.last_name,
      position: existingOfficial.position,
      personalEmail: updatedOfficial.personal_email
    }, req.user, { originalData: {
      skId: existingOfficial.sk_id,
      firstName: existingOfficial.first_name,
      lastName: existingOfficial.last_name,
      position: existingOfficial.position,
      personalEmail: existingOfficial.personal_email
    }});

    res.json({
      success: true,
      message: 'SK Official updated successfully',
      data: {
        skId: updatedOfficial.sk_id,
        firstName: updatedOfficial.first_name,
        lastName: updatedOfficial.last_name,
        middleName: updatedOfficial.middle_name,
        suffix: updatedOfficial.suffix,
        personalEmail: updatedOfficial.personal_email,
        updatedAt: updatedOfficial.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating SK official', { error: error.message, stack: error.stack, skId: req.params.id });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update SK official',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete SK Official (soft delete)
 * DELETE /api/sk-officials/:id
 */
const deleteSKOfficial = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if SK Official exists
    const existingQuery = `SELECT * FROM "SK_Officials" WHERE sk_id = $1`;
    const existingResult = await client.query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Official not found'
      });
    }

    const existingOfficial = existingResult.rows[0];

    // Soft delete by deactivating
    const deleteQuery = `
      UPDATE "SK_Officials" 
      SET 
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $1
      RETURNING *
    `;

    const result = await client.query(deleteQuery, [id]);
    const deletedOfficial = result.rows[0];

    await client.query('COMMIT');

    // Create audit log for SK Official deletion
    const deletedSKName = `${deletedOfficial.first_name} ${deletedOfficial.last_name}`;
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Delete',
      resource: '/api/sk-officials',
      resourceId: id,
      resourceName: deletedSKName,
      details: {
        skName: deletedSKName,
        resourceType: 'sk-officials',
        position: deletedOfficial.position,
        personalEmail: deletedOfficial.personal_email
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'sk-officials' }));

    // Send admin notifications using Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-officials', 'status', {
      skId: deletedOfficial.sk_id,
      firstName: deletedOfficial.first_name,
      lastName: deletedOfficial.last_name,
      position: deletedOfficial.position,
      personalEmail: deletedOfficial.personal_email
    }, req.user, { oldStatus: 'active', newStatus: 'deleted' });

    res.json({
      success: true,
      message: 'SK Official deleted successfully',
      data: {
        skId: deletedOfficial.sk_id,
        firstName: deletedOfficial.first_name,
        lastName: deletedOfficial.last_name,
        isActive: deletedOfficial.is_active
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting SK official', { error: error.message, stack: error.stack, skId: req.params.id });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete SK official',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// === STATUS MANAGEMENT ===

/**
 * Update SK Official status
 * PUT /api/sk-officials/:id/status
 */
const updateSKStatus = async (req, res) => {
  logger.debug('SK Status Update Request', {
    params: req.params,
    body: req.body,
    user: req.user?.id
  });

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    logger.debug('Processing status update', { id, status, userId: req.user?.id });

    // Validate status
    if (!status || !['active', 'inactive'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"',
        errors: ['Status must be either "active" or "inactive"']
      });
    }

    // Check if SK Official exists
    const existingCheck = await client.query(
      'SELECT * FROM "SK_Officials" WHERE sk_id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Official not found'
      });
    }

    const official = existingCheck.rows[0];
    logger.debug('Found existing SK Official', { 
      skId: official.sk_id, 
      currentStatus: official.is_active,
      name: `${official.first_name} ${official.last_name}`
    });

    // Update status
    const isActive = status === 'active';
    logger.debug('Updating to status', { status, isActive, skId: id });
    
    const updateQuery = `
      UPDATE "SK_Officials" 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $2
      RETURNING *
    `;

    logger.debug('Executing status update query', { skId: id, isActive });
    const result = await client.query(updateQuery, [isActive, id]);
    logger.debug('Update query completed', { rowsAffected: result.rowCount, skId: id });

    await client.query('COMMIT');

    // Send notifications (fire-and-forget)
    // Capture user context before setTimeout to prevent loss of req.user
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        logger.debug('Sending SK status update notification', { skId: id, status });
        await notificationService.notifyAdminsAboutSKStatusUpdate(official, status, currentUser);
      } catch (notifError) {
        logger.error('SK status update notification error', { error: notifError.message, stack: notifError.stack, skId: id });
      }
    }, 100);

    // Create audit log for SK Official status update
    const statusSKName = `${official.first_name} ${official.last_name}`;
    const actionName = status === 'active' ? 'Activate' : 'Deactivate';
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: actionName,
      resource: '/api/sk-officials',
      resourceId: id,
      resourceName: statusSKName,
      details: {
        skName: statusSKName,
        resourceType: 'sk-officials',
        newStatus: status,
        position: official.position,
        personalEmail: official.personal_email
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'sk-officials' }));

    // Enhanced admin notifications using Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-officials', 'status', {
      skId: official.sk_id,
      firstName: official.first_name,
      lastName: official.last_name,
      position: official.position,
      personalEmail: official.personal_email
    }, req.user, { oldStatus: status === 'active' ? 'inactive' : 'active', newStatus: status });

    res.json({
      success: true,
      message: `SK Official ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: {
        skId: result.rows[0].sk_id,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        isActive: result.rows[0].is_active,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating SK official status', { error: error.message, stack: error.stack, skId: id, status });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update SK official status',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// === VACANCY MANAGEMENT ENDPOINTS ===

/**
 * Get vacancy statistics for a specific barangay
 * GET /api/sk-officials/vacancies/barangay/:barangayId
 */
const getBarangayVacancies = async (req, res) => {
  try {
    const { barangayId } = req.params;
    const { termId, detailed = 'false' } = req.query;
    
    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required'
      });
    }
    
    let vacancies;
    if (detailed === 'true') {
      vacancies = await SKValidationService.getDetailedBarangayVacancies(barangayId, termId);
    } else {
      vacancies = await SKValidationService.getBarangayVacancies(barangayId, termId);
    }
    
    res.json({
      success: true,
      data: vacancies
    });
  } catch (error) {
    logger.error('Error fetching barangay vacancies', { error: error.message, stack: error.stack, barangayId: req.params.barangayId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barangay vacancies',
      error: error.message
    });
  }
};

/**
 * Get vacancy statistics for all barangays
 * GET /api/sk-officials/vacancies/all
 */
const getAllBarangayVacancies = async (req, res) => {
  try {
    const { termId } = req.query;
    
    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required'
      });
    }
    
    const allVacancies = await SKValidationService.getAllBarangayVacancies(termId);
    
    res.json({
      success: true,
      data: allVacancies
    });
  } catch (error) {
    logger.error('Error fetching all barangay vacancies', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all barangay vacancies',
      error: error.message
    });
  }
};

/**
 * Get overall vacancy statistics for active term
 * GET /api/sk-officials/vacancies/overall
 */
const getOverallVacancyStats = async (req, res) => {
  try {
    const { termId } = req.query;
    
    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required'
      });
    }
    
    const overallStats = await SKValidationService.getOverallVacancyStats(termId);
    
    res.json({
      success: true,
      data: overallStats
    });
  } catch (error) {
    logger.error('Error fetching overall vacancy stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overall vacancy statistics',
      error: error.message
    });
  }
};

/**
 * Validate position availability
 * POST /api/sk-officials/validate-position
 */
const validatePosition = async (req, res) => {
  try {
    const { barangayId, position, termId, excludeSkId } = req.body;
    
    if (!barangayId || !position || !termId) {
      return res.status(400).json({
        success: false,
        message: 'Barangay ID, position, and term ID are required'
      });
    }
    
    const validation = await SKValidationService.validatePositionAvailability(
      barangayId, 
      termId, 
      position, 
      excludeSkId
    );
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Error validating position', { error: error.message, stack: error.stack, position: req.body?.position, barangayId: req.body?.barangayId });
    res.status(500).json({
      success: false,
      message: 'Failed to validate position',
      error: error.message
    });
  }
};

export default {
  // List & Search
  getAllSKOfficials,
  searchSKOfficials,
  getSKStatistics,
  
  // Individual Operations
  getSKOfficialById,
  createSKOfficial,
  updateSKOfficial,
  deleteSKOfficial,
  
  // Status Management
  updateSKStatus,
  
  // Vacancy Management
  getBarangayVacancies,
  getAllBarangayVacancies,
  getOverallVacancyStats,
  validatePosition
};
