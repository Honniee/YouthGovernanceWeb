import { query, getClient } from '../../../backend/config/database.js';
import { generateSKId, generateUserId } from '../../../backend/utils/idGenerator.js';
import { generateSKOrgEmail } from '../../../backend/utils/emailGenerator.js';
import { generateSecurePassword } from '../../../backend/utils/passwordGenerator.js';
import { sanitizeInput } from '../../../backend/utils/validation.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import xlsx from 'xlsx';

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
import notificationService from '../../../backend/services/notificationService.js';
import usersTableHelper from '../../../backend/utils/usersTableHelper.js';
import skValidation from '../../../backend/utils/skValidation.js';
import { createAuditLog } from '../../../backend/middleware/auditLogger.js';

const { createUserForSK: createUserForSKOfficial } = usersTableHelper;

const {
  validateSKCreation,
  validateSKStatusUpdate,
  validateSKBulkOperation,
  validateSKSearchParams,
  validateBarangayExists,
  getActiveTerm,
  checkPositionConflict
} = skValidation;

// === LIST & SEARCH OPERATIONS ===

/**
 * Get all SK Officials with pagination, filtering, and search
 * GET /api/sk-officials
 */
const getAllSKOfficials = async (req, res) => {
  console.log('🎯 getAllSKOfficials controller function called!');
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

    console.log('🔍 SK Officials Query Parameters:', {
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
    } else {
      // Default to active term if no specific term requested
      whereConditions.push(`t.status = 'active'`);
    }

    // Search functionality
    if (search && search.trim()) {
      paramCount++;
      whereConditions.push(`(
        LOWER(sk.first_name) LIKE $${paramCount} OR 
        LOWER(sk.last_name) LIKE $${paramCount} OR 
        LOWER(sk.personal_email) LIKE $${paramCount} OR
        LOWER(sk.email) LIKE $${paramCount} OR
        LOWER(sk.sk_id) LIKE $${paramCount}
      )`);
      queryParams.push(`%${search.trim().toLowerCase()}%`);
    }

    // Status filter
    if (status !== 'all') {
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
    const allowedSortFields = ['created_at', 'first_name', 'last_name', 'position', 'is_active', 'barangay_name', 'full_name'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'last_name';
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
        CONCAT(sk.first_name, ' ', COALESCE(sk.middle_name, ''), ' ', sk.last_name, ' ', COALESCE(sk.suffix, '')) as full_name
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
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

    console.log('🔍 Executing SK Officials queries...');
    
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
      barangayName: row.barangay_name,
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
      termName: row.term_name
    }));

    const total = parseInt(countResult.rows[0]?.total || '0');
    const totalPages = Math.ceil(total / parseInt(limit));

    console.log(`✅ SK Officials loaded: ${items.length} items, ${total} total`);

    res.json({
      success: true,
        page: parseInt(page),
        limit: parseInt(limit),
      total,
      items,
      hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
    });

  } catch (error) {
    console.error('❌ Error fetching SK Officials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Officials',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Search SK Officials with advanced filters
 * GET /api/sk-officials/search
 */
const searchSKOfficials = async (req, res) => {
  // Delegate to getAllSKOfficials since it already handles search
  return getAllSKOfficials(req, res);
};

/**
 * Get SK Officials statistics
 * GET /api/sk-officials/statistics
 */
const getSKStatistics = async (req, res) => {
  try {
    // REAL DATABASE QUERY for SK Statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_officials,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_officials,
        COUNT(CASE WHEN sk.is_active = false THEN 1 END) as inactive_officials,
        COUNT(DISTINCT sk.barangay_id) as barangays_with_officials,
        COUNT(CASE WHEN sk.position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN sk.position = 'SK Councilor' THEN 1 END) as councilors,
        COUNT(CASE WHEN sk.position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN sk.position = 'SK Treasurer' THEN 1 END) as treasurers
      FROM "SK_Officials" sk
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      WHERE t.status = 'active'
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Get barangay breakdown
    const barangayStatsQuery = `
      SELECT 
        b.barangay_name,
        COUNT(sk.sk_id) as official_count,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_count
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id 
        AND sk.term_id = (SELECT term_id FROM "SK_Terms" WHERE status = 'active' LIMIT 1)
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY official_count DESC, b.barangay_name
    `;

    const barangayResult = await query(barangayStatsQuery);

    const byBarangay = {};
    barangayResult.rows.forEach(row => {
      byBarangay[row.barangay_name] = parseInt(row.official_count);
    });

    return res.json({
      success: true,
      data: {
        total: parseInt(stats.total_officials),
        active: parseInt(stats.active_officials),
        inactive: parseInt(stats.inactive_officials),
        byPosition: {
          chairpersons: parseInt(stats.chairpersons),
          secretaries: parseInt(stats.secretaries),
          treasurers: parseInt(stats.treasurers),
          councilors: parseInt(stats.councilors)
        },
        byBarangay
      }
    });

    // ORIGINAL CODE (commented out until database is ready):
    /*
    const statsQuery = `
      SELECT 
        COUNT(*) as total_officials,
        COUNT(CASE WHEN sk.status = 'active' THEN 1 END) as active_officials,
        COUNT(CASE WHEN sk.status = 'inactive' THEN 1 END) as inactive_officials,
        COUNT(DISTINCT sk.barangay_id) as barangays_with_officials,
        COUNT(CASE WHEN sk.position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN sk.position = 'SK Councilor' THEN 1 END) as councilors,
        COUNT(CASE WHEN sk.position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN sk.position = 'SK Treasurer' THEN 1 END) as treasurers
      FROM "SK_Officials" sk
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      WHERE t.status = 'active'
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Get barangay breakdown
    const barangayStatsQuery = `
      SELECT 
        b.barangay_name,
        COUNT(sk.sk_id) as official_count,
        COUNT(CASE WHEN sk.status = 'active' THEN 1 END) as active_count
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id 
        AND sk.term_id = (SELECT term_id FROM "SK_Terms" WHERE status = 'active' LIMIT 1)
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY official_count DESC, b.barangay_name
    `;

    const barangayResult = await query(barangayStatsQuery);

    res.json({
      success: true,
      data: {
        overview: {
          totalOfficials: parseInt(stats.total_officials),
          activeOfficials: parseInt(stats.active_officials),
          inactiveOfficials: parseInt(stats.inactive_officials),
          barangaysWithOfficials: parseInt(stats.barangays_with_officials)
        },
        positions: {
          chairpersons: parseInt(stats.chairpersons),
          councilors: parseInt(stats.councilors),
          secretaries: parseInt(stats.secretaries),
          treasurers: parseInt(stats.treasurers)
        },
        barangayBreakdown: barangayResult.rows.map(row => ({
          barangayName: row.barangay_name,
          officialCount: parseInt(row.official_count),
          activeCount: parseInt(row.active_count)
        }))
      }
    });

  */
  } catch (error) {
    console.error('Error fetching SK statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK statistics',
      error: error.message
    });
  }
};

// === INDIVIDUAL SK OFFICIAL OPERATIONS ===

/**
 * Get SK Official by ID
 * GET /api/sk-officials/:id
 */
const getSKOfficialById = async (req, res) => {
  try {
    const { id } = req.params;

    const sqlQuery = `
      SELECT 
        sk.sk_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.personal_email,
        sk.email,
        sk.is_active,
        sk.created_at,
        sk.updated_at,
        b.barangay_name,
        b.barangay_id,
        t.term_name,
        t.term_id,
        t.start_date as term_start,
        t.end_date as term_end
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      JOIN "SK_Terms" t ON sk.term_id = t.term_id
      WHERE sk.sk_id = $1
    `;

    const result = await query(sqlQuery, [id]);

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
        firstName: official.first_name,
        lastName: official.last_name,
        middleName: official.middle_name,
        suffix: official.suffix,
        position: official.position,
        personalEmail: official.personal_email,
        orgEmail: official.org_email,
        status: official.status,
        barangayName: official.barangay_name,
        barangayId: official.barangay_id,
        termName: official.term_name,
        termId: official.term_id,
        termStart: official.term_start,
        termEnd: official.term_end,
        createdAt: official.created_at,
        updatedAt: official.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching SK Official:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Official',
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

    // Check for position conflicts
    const positionConflict = await checkPositionConflict(
      sanitizedData.position, 
      barangayId, 
      activeTerm.term_id, 
      client
    );
    
    if (positionConflict.hasConflict) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: positionConflict.message
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
    await createUserForSKOfficial(skId, client);

    await client.query('COMMIT');

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
    }).catch(err => console.error('SK welcome notification failed:', err));

    // Send admin notifications (fire-and-forget)
    // Capture user context before setTimeout to prevent loss of req.user
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        // Notify admins about new SK Official
        console.log('🔔 Sending notification with user context:', currentUser);
        await notificationService.notifyAdminsAboutSKCreation(newOfficial, currentUser);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }, 100);

    // Create audit log for SK Official creation
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'CREATE',
      resource: 'sk-officials',
      resourceId: newOfficial.sk_id,
      details: `Created SK Official: ${newOfficial.first_name} ${newOfficial.last_name} (${newOfficial.position}) in ${barangayCheck.barangayName}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));

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
          personalEmail: newOfficial.personal_email,
          email: newOfficial.email,
          barangayId: newOfficial.barangay_id,
          termId: newOfficial.term_id,
          isActive: newOfficial.is_active,
          createdAt: newOfficial.created_at
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
    console.error('Error creating SK Official:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SK Official',
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
    const {
      firstName,
      lastName,
      middleName = '',
      suffix = '',
      position,
      barangayId,
      personalEmail
    } = req.body;

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

    const existingOfficial = existingCheck.rows[0];

    // Validate input data
    const validation = validateSKCreation({
      firstName,
      lastName,
      middleName,
      suffix,
      position,
      barangayId,
      personalEmail
    });

    if (!validation.isValid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

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

    // Check for position conflicts (exclude current official)
    if (position !== existingOfficial.position || barangayId !== existingOfficial.barangay_id) {
      const positionConflict = await checkPositionConflict(
        sanitizedData.position,
        barangayId,
        existingOfficial.term_id,
        client,
        id // Exclude current official from conflict check
      );
      
      if (positionConflict.hasConflict) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: positionConflict.message
        });
      }
    }

    // Check if personal email already exists (exclude current official)
    if (personalEmail !== existingOfficial.personal_email) {
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

    // Generate new organizational email if name or barangay changed
    let orgEmail = existingOfficial.org_email;
    if (firstName !== existingOfficial.first_name || 
        lastName !== existingOfficial.last_name || 
        barangayId !== existingOfficial.barangay_id) {
      orgEmail = await generateSKOrgEmail(
        sanitizedData.firstName,
        sanitizedData.lastName,
        barangayCheck.barangayName,
        client
      );
    }

    // Update SK Official
    const updateQuery = `
      UPDATE "SK_Officials" 
      SET first_name = $1, last_name = $2, middle_name = $3, suffix = $4,
          position = $5, barangay_id = $6, personal_email = $7, org_email = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $9
      RETURNING *
    `;

    const updateValues = [
      sanitizedData.firstName,
      sanitizedData.lastName,
      sanitizedData.middleName,
      sanitizedData.suffix,
      sanitizedData.position,
      barangayId,
      sanitizedData.personalEmail,
      orgEmail,
      id
    ];

    const result = await client.query(updateQuery, updateValues);
    const updatedOfficial = result.rows[0];

    await client.query('COMMIT');

    // Send notifications (fire-and-forget)
    // Capture user context before setTimeout to prevent loss of req.user
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        console.log('🔔 Sending update notification with user context:', currentUser);
        await notificationService.notifyAdminsAboutSKUpdate(updatedOfficial, existingOfficial, currentUser);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }, 100);

    // Create audit log for SK Official update
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'UPDATE',
      resource: 'sk-officials',
      resourceId: updatedOfficial.sk_id,
      details: `Updated SK Official: ${updatedOfficial.first_name} ${updatedOfficial.last_name} (${updatedOfficial.position})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'SK Official updated successfully',
      data: {
        skId: updatedOfficial.sk_id,
        firstName: updatedOfficial.first_name,
        lastName: updatedOfficial.last_name,
        middleName: updatedOfficial.middle_name,
        suffix: updatedOfficial.suffix,
        position: updatedOfficial.position,
        personalEmail: updatedOfficial.personal_email,
        orgEmail: updatedOfficial.org_email,
        barangayId: updatedOfficial.barangay_id,
        status: updatedOfficial.status,
        updatedAt: updatedOfficial.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating SK Official:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SK Official',
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

    // Soft delete by setting status to 'deleted'
    const deleteQuery = `
      UPDATE "SK_Officials" 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $1
      RETURNING *
    `;

    const result = await client.query(deleteQuery, [id]);

    await client.query('COMMIT');

    // Send notifications (fire-and-forget)
    setTimeout(async () => {
      try {
        await notificationService.notifyAdminsAboutSKDeletion(official, req.user);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }, 100);

    // Create audit log for SK Official deletion
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'DELETE',
      resource: 'sk-officials',
      resourceId: result.rows[0].sk_id,
      details: `Deleted SK Official: ${existingOfficial.first_name} ${existingOfficial.last_name} (${existingOfficial.position})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'SK Official deleted successfully',
      data: {
        skId: result.rows[0].sk_id,
        status: result.rows[0].status
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting SK Official:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SK Official',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// === STATUS MANAGEMENT ===

/**
 * Update SK Official status
 * PATCH /api/sk-officials/:id/status
 */
const updateSKStatus = async (req, res) => {
  console.log('🔄 SK Status Update Request:', {
    params: req.params,
    body: req.body,
    user: req.user?.id
  });

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    console.log('📝 Processing status update:', { id, status });

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
    console.log('✅ Found existing SK Official:', { 
      skId: official.sk_id, 
      currentStatus: official.is_active,
      name: `${official.first_name} ${official.last_name}`
    });

    // Update status
    const isActive = status === 'active';
    console.log('🔄 Updating to status:', { status, isActive });
    
    const updateQuery = `
      UPDATE "SK_Officials" 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE sk_id = $2
      RETURNING *
    `;

    console.log('📊 Executing update query:', { query: updateQuery, params: [isActive, id] });
    const result = await client.query(updateQuery, [isActive, id]);
    console.log('✅ Update query completed:', { rowsAffected: result.rowCount });

    await client.query('COMMIT');

    // Send notifications (fire-and-forget)
    // Capture user context before setTimeout to prevent loss of req.user
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        console.log('🔔 Sending status change notification with user context:', currentUser);
        await notificationService.notifyAdminsAboutSKStatusChange(
          result.rows[0], 
          official.status, 
          currentUser
        );
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }, 100);

    // Create audit log for SK Official status update
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: status === 'active' ? 'ACTIVATE' : 'DEACTIVATE',
      resource: 'sk-officials',
      resourceId: result.rows[0].sk_id,
      details: `${status === 'active' ? 'Activated' : 'Deactivated'} SK Official: ${official.first_name} ${official.last_name} (${official.position})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: `SK Official ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: {
        skId: result.rows[0].sk_id,
        isActive: result.rows[0].is_active,
        status: result.rows[0].is_active ? 'active' : 'inactive',
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ DETAILED ERROR in updateSKStatus:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      requestId: req.params.id,
      requestStatus: req.body.status
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update SK Official status',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Activate SK Official
 * PATCH /api/sk-officials/:id/activate
 */
const activateSKOfficial = async (req, res) => {
  req.body.status = 'active';
  return updateSKStatus(req, res);
};

/**
 * Deactivate SK Official
 * PATCH /api/sk-officials/:id/deactivate
 */
const deactivateSKOfficial = async (req, res) => {
  req.body.status = 'inactive';
  return updateSKStatus(req, res);
};

// Placeholder functions for remaining operations
// These will be implemented in the next iteration

const bulkUpdateStatus = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Bulk status update not yet implemented'
  });
};

const bulkActivate = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Bulk activate not yet implemented'
  });
};

const bulkDeactivate = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Bulk deactivate not yet implemented'
  });
};

const bulkDelete = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Bulk delete not yet implemented'
  });
};

const bulkImportSKOfficials = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
    success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    console.log('📁 Processing SK bulk import file:', file.originalname);

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload CSV or Excel file.'
      });
    }

    // Get active term first
    const activeTerm = await getActiveTerm();
    if (!activeTerm) {
      return res.status(400).json({
        success: false,
        message: 'No active SK term found. Please create an active term first.'
      });
    }

    // Parse file content
    let records = [];
    
    if (file.mimetype === 'text/csv') {
      records = await parseCSVFile(file.buffer);
    } else {
      records = await parseExcelFile(file.buffer);
    }

    console.log(`📊 Parsed ${records.length} records from file`);

    // Validate and process records
    const results = await processSKBulkImport(records, activeTerm, req.user);

    // Send bulk import completion notification
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        await notificationService.notifyAdminsAboutSKBulkImport(results, currentUser);
      } catch (notifError) {
        console.error('Bulk import notification error:', notifError);
      }
    }, 100);

    // Create audit log for bulk import
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'BULK_IMPORT',
      resource: 'sk-officials',
      resourceId: `bulk-${Date.now()}`,
      details: `Bulk imported ${results.summary.importedRecords} SK Officials from ${file.originalname} (${results.summary.totalRows} total rows, ${results.summary.errors} errors)`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'Bulk import completed successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ SK Bulk import error:', error);
    
    // Create audit log for failed import
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'BULK_IMPORT',
      resource: 'sk-officials',
      resourceId: `bulk-${Date.now()}`,
      details: `Failed to bulk import SK Officials: ${error.message}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'error'
    }).catch(err => console.error('Audit log failed:', err));

    res.status(500).json({
      success: false,
      message: 'Failed to process bulk import',
      error: error.message
    });
  }
};

// === BULK IMPORT HELPER FUNCTIONS ===

/**
 * Parse CSV file content
 */
const parseCSVFile = async (buffer) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.toLowerCase().replace(/\s+/g, '_')
      }))
      .on('data', (data) => records.push(data))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
};

/**
 * Parse Excel file content
 */
const parseExcelFile = async (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header mapping
    const records = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    }).map(record => {
      // Normalize headers (lowercase, replace spaces with underscores)
      const normalizedRecord = {};
      Object.keys(record).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        normalizedRecord[normalizedKey] = record[key];
      });
      return normalizedRecord;
    });
    
    return records;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Process SK Officials bulk import
 */
const processSKBulkImport = async (records, activeTerm, currentUser) => {
  const results = {
    summary: {
      totalRows: records.length,
      validRecords: 0,
      importedRecords: 0,
      errors: 0
    },
    imported: [],
    errors: []
  };

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 for 1-based indexing and header row

      try {
        // Validate required fields
        const validation = validateSKBulkRecord(record, rowNumber);
        if (!validation.isValid) {
          results.errors.push(...validation.errors);
          results.summary.errors++;
          continue;
        }

        results.summary.validRecords++;

        // Sanitize data
        const sanitizedData = {
          firstName: sanitizeString(record.first_name),
          lastName: sanitizeString(record.last_name),
          middleName: sanitizeString(record.middle_name || ''),
          suffix: sanitizeString(record.suffix || ''),
          position: sanitizeString(record.position),
          personalEmail: sanitizeString(record.personal_email).toLowerCase(),
          barangayId: sanitizeString(record.barangay_id)
        };

        // Verify barangay exists
        const barangayCheck = await validateBarangayExists(sanitizedData.barangayId, client);
        if (!barangayCheck.exists) {
          results.errors.push(`Row ${rowNumber}: Invalid barangay ID: ${sanitizedData.barangayId}`);
          results.summary.errors++;
          continue;
        }

        // Check for position conflicts
        const positionConflict = await checkPositionConflict(
          sanitizedData.position,
          sanitizedData.barangayId,
          activeTerm.term_id,
          client
        );
        
        if (positionConflict.hasConflict) {
          results.errors.push(`Row ${rowNumber}: ${positionConflict.message}`);
          results.summary.errors++;
          continue;
        }

        // Check if personal email already exists
        const emailCheckQuery = `
          SELECT sk_id FROM "SK_Officials" WHERE personal_email = $1
          UNION
          SELECT lydo_id FROM "LYDO" WHERE personal_email = $1
        `;
        const emailCheck = await client.query(emailCheckQuery, [sanitizedData.personalEmail]);
        
        if (emailCheck.rows.length > 0) {
          results.errors.push(`Row ${rowNumber}: Personal email already exists: ${sanitizedData.personalEmail}`);
          results.summary.errors++;
          continue;
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
          sanitizedData.barangayId,
          activeTerm.term_id,
          sanitizedData.personalEmail,
          orgEmail,
          passwordHash,
          true, // is_active
          false, // email_verified
          currentUser?.id || 'BULK_IMPORT'
        ];

        const result = await client.query(insertQuery, insertValues);
        const newOfficial = result.rows[0];

        // Create Users table entry
        await createUserForSKOfficial(skId, client);

        // Send welcome notification to SK Official (fire-and-forget)
        setTimeout(() => {
          notificationService.sendSKWelcomeNotification({
            sk_id: newOfficial.sk_id,
            first_name: newOfficial.first_name,
            last_name: newOfficial.last_name,
            personal_email: newOfficial.personal_email,
            org_email: newOfficial.email,
            position: newOfficial.position,
            password: password,
            barangay_name: barangayCheck.barangayName
          }).catch(err => console.error(`SK welcome notification failed for ${newOfficial.sk_id}:`, err));
        }, i * 100); // Stagger emails to avoid overwhelming the email service

        // Create individual audit log for each SK official
        setTimeout(() => {
          createAuditLog({
            userId: currentUser?.id || 'SYSTEM',
            userType: currentUser?.userType || 'admin',
            action: 'CREATE',
            resource: 'sk-officials',
            resourceId: newOfficial.sk_id,
            details: `Created SK Official via bulk import: ${newOfficial.first_name} ${newOfficial.last_name} (${newOfficial.position}) in ${barangayCheck.barangayName}`,
            ipAddress: '127.0.0.1', // Bulk import doesn't have direct IP
            userAgent: 'Bulk Import',
            status: 'success'
          }).catch(err => console.error('Individual audit log failed:', err));
        }, i * 50);

        results.imported.push({
          skId: newOfficial.sk_id,
          name: `${newOfficial.first_name} ${newOfficial.last_name}`,
          position: newOfficial.position,
          barangay: barangayCheck.barangayName,
          email: newOfficial.personal_email
        });

        results.summary.importedRecords++;
        console.log(`✅ Imported SK Official ${i + 1}/${records.length}: ${newOfficial.first_name} ${newOfficial.last_name}`);

      } catch (recordError) {
        console.error(`❌ Error processing row ${rowNumber}:`, recordError);
        results.errors.push(`Row ${rowNumber}: ${recordError.message}`);
        results.summary.errors++;
      }
    }

    await client.query('COMMIT');
    console.log(`🎉 SK Bulk import completed: ${results.summary.importedRecords} imported, ${results.summary.errors} errors`);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return results;
};

/**
 * Validate SK bulk import record
 */
const validateSKBulkRecord = (record, rowNumber) => {
  const errors = [];
  const requiredFields = ['first_name', 'last_name', 'position', 'personal_email', 'barangay_id'];

  requiredFields.forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field: ${field.replace('_', ' ')}`);
    }
  });

  // Validate email format
  if (record.personal_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(record.personal_email)) {
      errors.push(`Row ${rowNumber}: Invalid email format: ${record.personal_email}`);
    }
  }

  // Validate position
  const validPositions = ['SK Chairperson', 'SK Secretary', 'SK Treasurer', 'SK Councilor'];
  if (record.position && !validPositions.includes(record.position)) {
    errors.push(`Row ${rowNumber}: Invalid position. Must be one of: ${validPositions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const exportSKOfficialsCSV = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'CSV export not yet implemented'
  });
};

const exportSKOfficialsPDF = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'PDF export not yet implemented'
  });
};

const exportSKOfficialsExcel = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Excel export not yet implemented'
  });
};

const getSKOfficialsByTerm = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get SK Officials by term not yet implemented'
  });
};

const getCurrentTermOfficials = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get current term officials not yet implemented'
  });
};

const getSKOfficialsByBarangay = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get SK Officials by barangay not yet implemented'
  });
};

const getBarangayPositions = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get barangay positions not yet implemented'
  });
};

const getAvailablePositions = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get available positions not yet implemented'
  });
};

const getPositionConflicts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get position conflicts not yet implemented'
  });
};

const updateSKProfile = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update SK profile not yet implemented'
  });
};

const updateSKContact = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update SK contact not yet implemented'
  });
};

const getSKOfficialHistory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get SK Official history not yet implemented'
  });
};

const getSKOfficialActivities = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get SK Official activities not yet implemented'
  });
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
  activateSKOfficial,
  deactivateSKOfficial,
  
  // Bulk Operations
  bulkUpdateStatus,
  bulkActivate,
  bulkDeactivate,
  bulkDelete,
  
  // Import/Export
  bulkImportSKOfficials,
  exportSKOfficialsCSV,
  exportSKOfficialsPDF,
  exportSKOfficialsExcel,
  
  // Term-specific
  getSKOfficialsByTerm,
  getCurrentTermOfficials,
  
  // Barangay-specific
  getSKOfficialsByBarangay,
  getBarangayPositions,
  
  // Position Management
  getAvailablePositions,
  getPositionConflicts,
  
  // Profile & Contact
  updateSKProfile,
  updateSKContact,
  
  // Audit & History
  getSKOfficialHistory,
  getSKOfficialActivities
};
