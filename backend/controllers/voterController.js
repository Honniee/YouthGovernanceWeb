import { query, getClient } from '../config/database.js';
import { generateVoterId } from '../utils/idGenerator.js';
import { validateVoterCreation, validateVoterUpdate, validateBulkImport } from '../utils/voterValidation.js';
import { handleError } from '../services/errorService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import universalNotificationService from '../services/universalNotificationService.js';
import { parseCSVFile, parseExcelFile } from '../utils/fileParser.js';
import logger from '../utils/logger.js';

// === CORE CRUD OPERATIONS ===

/**
 * Get all voters with pagination, filtering, and sorting
 * GET /api/voters
 */
const getVoters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'last_name',
      sortOrder = 'asc',
      gender = '',
      ageRange = '',
      dateCreated = '',
      status = 'active',
      hasParticipated = '' // New filter: 'true', 'false', or '' for all
    } = req.query;

    const offset = (page - 1) * limit;
    const userId = req.user?.lydo_id || req.user?.lydoId;

    // Build WHERE clause (base filters; status handled separately)
    let baseWhereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      baseWhereConditions.push(`(LOWER(v.first_name) LIKE LOWER($${paramIndex}) OR LOWER(v.last_name) LIKE LOWER($${paramIndex}) OR LOWER(v.voter_id) LIKE LOWER($${paramIndex}))`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (gender) {
      baseWhereConditions.push(`v.gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    // Handle age range filtering
    if (ageRange) {
      switch (ageRange) {
        case '15-17':
          baseWhereConditions.push(`EXTRACT(YEAR FROM AGE(v.birth_date)) BETWEEN 15 AND 17`);
          break;
        case '18-24':
          baseWhereConditions.push(`EXTRACT(YEAR FROM AGE(v.birth_date)) BETWEEN 18 AND 24`);
          break;
        case '25-30':
          baseWhereConditions.push(`EXTRACT(YEAR FROM AGE(v.birth_date)) BETWEEN 25 AND 30`);
          break;
      }
    }

    // Handle date created filtering
    if (dateCreated) {
      baseWhereConditions.push(`DATE(v.created_at) >= $${paramIndex}`);
      queryParams.push(dateCreated);
      paramIndex++;
    }

    const baseWhereClause = baseWhereConditions.join(' AND ');
    const statusClause =
      status === 'active'
        ? ' AND v.is_active = true'
        : status === 'archived'
          ? ' AND v.is_active = false'
          : '';
    const whereClause = `${baseWhereClause}${statusClause}`;

    // Validate sort fields
    const allowedSortFields = ['last_name', 'first_name', 'gender', 'birth_date', 'created_at', 'voter_id'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'last_name';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Snapshot params before adding pagination (used for count and stats)
    const baseParams = [...queryParams];

    // Get total count with all filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Voters_List" v
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, baseParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data - plain rows from Voters_List
    const dataQuery = `
      SELECT 
        v.voter_id,
        v.first_name,
        v.last_name,
        v.middle_name,
        v.suffix,
        v.birth_date,
        v.gender,
        v.is_active,
        v.created_at,
        v.updated_at,
        v.created_by
      FROM "Voters_List" v
      WHERE ${whereClause}
      ORDER BY v.${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const dataResult = await query(dataQuery, queryParams);

    // Use rows as-is
    const filteredData = dataResult.rows;

    // Basic stats for tab badges using base filters (no status clause)
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN v.is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN v.is_active = false THEN 1 END) as archived
      FROM "Voters_List" v
      WHERE ${baseWhereClause}
    `;
    const statsResult = await query(statsQuery, baseParams);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: filteredData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        archived: parseInt(stats.archived) || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching voters', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to fetch voters');
  }
};

/**
 * Get voter by ID
 * GET /api/voters/:id
 */
const getVoterById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        v.voter_id,
        v.first_name,
        v.last_name,
        v.middle_name,
        v.suffix,
        v.birth_date,
        v.gender,
        v.is_active,
        v.created_at,
        v.updated_at,
        v.created_by,
        COALESCE(
          NULLIF(CONCAT_WS(' ', lydo_creator.first_name, lydo_creator.middle_name, lydo_creator.last_name, lydo_creator.suffix), ''),
          NULLIF(CONCAT_WS(' ', sk_creator.first_name, sk_creator.middle_name, sk_creator.last_name, sk_creator.suffix), ''),
          v.created_by
        ) AS created_by_name
      FROM "Voters_List" v
      LEFT JOIN "LYDO" lydo_creator ON v.created_by = lydo_creator.lydo_id
      LEFT JOIN "SK_Officials" sk_creator ON v.created_by = sk_creator.sk_id
      WHERE v.voter_id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching voter', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to fetch voter');
  }
};

/**
 * Create new voter
 * POST /api/voters
 */
const createVoter = async (req, res) => {
  const client = await getClient();
  
  try {
    const voterData = req.body;
    let lydoId = req.user?.lydo_id || req.user?.lydoId || req.user?.userId || req.user?.id;

    // Validate input
    const validation = await validateVoterCreation(voterData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    await client.query('BEGIN');

    // If missing LYDO ID, try to resolve by email
    if (!lydoId && req.user?.email) {
      try {
        const lookup = await client.query('SELECT lydo_id FROM "LYDO" WHERE LOWER(email) = LOWER($1) AND is_active = true', [req.user.email]);
        lydoId = lookup.rows?.[0]?.lydo_id || null;
      } catch (_) {
        // ignore and fallback below
      }
    }

    // Schema shows created_by REFERENCES "LYDO"(lydo_id). Use LYDO id directly.
    const createdBy = lydoId;
    if (!createdBy) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: 'Missing LYDO ID for creator. Please re-login and try again.' });
    }

    // Generate voter ID
    const voterId = await generateVoterId();

    // Insert voter
    const insertQuery = `
      INSERT INTO "Voters_List" (
        voter_id,
        first_name,
        last_name,
        middle_name,
        suffix,
        birth_date,
        gender,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const insertParams = [
      voterId,
      voterData.first_name,
      voterData.last_name,
      voterData.middle_name || null,
      voterData.suffix || null,
      voterData.birth_date,
      voterData.gender,
      createdBy
    ];

    const result = await client.query(insertQuery, insertParams);
    const newVoter = result.rows[0];

    await client.query('COMMIT');

    // Get voter name for logging
    const voterName = `${newVoter.last_name}, ${newVoter.first_name}`;

    // Log activity
    try {
      await createAuditLog({
        userId: lydoId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Create',
        resource: '/api/voters',
        resourceId: newVoter.voter_id,
        resourceName: voterName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          voterId: newVoter.voter_id,
          voterName: voterName,
          gender: newVoter.gender
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for voter creation', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'creation',
          {
            entityData: {
              voterId: newVoter.voter_id,
              voterName: voterName,
              createdBy: createdBy
            },
            user: {
              id: lydoId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        logger.error('Voter creation notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.status(201).json({
      success: true,
      message: 'Voter created successfully',
      data: newVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating voter', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to create voter');
  } finally {
    client.release();
  }
};

/**
 * Update voter
 * PUT /api/voters/:id
 */
const updateVoter = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const voterData = req.body;
    const userId = req.user?.lydo_id || req.user?.lydoId;

    // Validate input
    const validation = await validateVoterUpdate(voterData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    await client.query('BEGIN');

    // Check if voter exists
    const checkQuery = 'SELECT * FROM "Voters_List" WHERE voter_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    const oldVoter = checkResult.rows[0];

    // Update voter
    const updateQuery = `
      UPDATE "Voters_List"
      SET 
        first_name = $1,
        last_name = $2,
        middle_name = $3,
        suffix = $4,
        birth_date = $5,
        gender = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE voter_id = $7
      RETURNING *
    `;

    const updateParams = [
      voterData.first_name,
      voterData.last_name,
      voterData.middle_name || null,
      voterData.suffix || null,
      voterData.birth_date,
      voterData.gender,
      id
    ];

    const result = await client.query(updateQuery, updateParams);
    const updatedVoter = result.rows[0];

    await client.query('COMMIT');

    // Get voter name for logging
    const voterName = `${updatedVoter.last_name}, ${updatedVoter.first_name}`;

    // Get user_id from Users table for logging (similar to staff/youth management)
    let createdBy = userId;
    if (userId) {
      try {
        const userQuery = await query(
          'SELECT user_id FROM "Users" WHERE lydo_id = $1 LIMIT 1',
          [userId]
        );
        if (userQuery.rows.length > 0) {
          createdBy = userQuery.rows[0].user_id;
        }
      } catch (userError) {
        logger.error('Failed to lookup user_id', { error: userError.message, stack: userError.stack });
        // Fall back to lydo_id
      }
    }

    // Log activity
    try {
      await createAuditLog({
        userId: createdBy || req.user?.id || req.user?.user_id || userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Update',
        resource: '/api/voters',
        resourceId: updatedVoter.voter_id,
        resourceName: voterName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          voterId: updatedVoter.voter_id,
          voterName: voterName
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      logger.debug('Voter update audit log created');
    } catch (logError) {
      logger.error('Failed to log activity for voter update', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'update',
          {
            entityData: {
              voterId: updatedVoter.voter_id,
              voterName: voterName,
              updatedBy: userId
            },
            user: {
              id: userId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        logger.error('Voter update notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter updated successfully',
      data: updatedVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating voter', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to update voter');
  } finally {
    client.release();
  }
};

/**
 * Soft delete voter (archive)
 * DELETE /api/voters/:id
 */
const deleteVoter = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const userId = req.user?.lydo_id || req.user?.lydoId;

    await client.query('BEGIN');

    // Check if voter exists
    const checkQuery = 'SELECT * FROM "Voters_List" WHERE voter_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    const voter = checkResult.rows[0];

    // Soft delete (archive)
    const deleteQuery = `
      UPDATE "Voters_List"
      SET 
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE voter_id = $1
      RETURNING *
    `;

    const result = await client.query(deleteQuery, [id]);
    const deletedVoter = result.rows[0];

    await client.query('COMMIT');

    // Get voter name for logging
    const voterName = `${deletedVoter.last_name}, ${deletedVoter.first_name}`;

    // Log activity
    try {
      await createAuditLog({
        userId: userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Archive',
        resource: '/api/voters',
        resourceId: deletedVoter.voter_id,
        resourceName: voterName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          voterId: deletedVoter.voter_id,
          voterName: voterName,
          newStatus: 'archived'
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for voter archive', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'status',
          {
            entityData: {
              voterId: deletedVoter.voter_id,
              voterName: voterName,
              oldStatus: 'active',
              newStatus: 'archived',
              archivedBy: userId
            },
            user: {
              id: userId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        logger.error('Voter archive notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter archived successfully',
      data: deletedVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error archiving voter', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to archive voter');
  } finally {
    client.release();
  }
};

/**
 * Restore archived voter
 * PATCH /api/voters/:id/restore
 */
const restoreVoter = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const userId = req.user?.lydo_id || req.user?.lydoId;

    await client.query('BEGIN');

    // Check if voter exists and is archived
    const checkQuery = 'SELECT * FROM "Voters_List" WHERE voter_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    const voter = checkResult.rows[0];

    if (voter.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Voter is already active'
      });
    }

    // Restore voter
    const restoreQuery = `
      UPDATE "Voters_List"
      SET 
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE voter_id = $1
      RETURNING *
    `;

    const result = await client.query(restoreQuery, [id]);
    const restoredVoter = result.rows[0];

    await client.query('COMMIT');

    // Get voter name for logging
    const voterName = `${restoredVoter.last_name}, ${restoredVoter.first_name}`;

    // Log activity
    try {
      await createAuditLog({
        userId: userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Restore',
        resource: '/api/voters',
        resourceId: restoredVoter.voter_id,
        resourceName: voterName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          voterId: restoredVoter.voter_id,
          voterName: voterName,
          newStatus: 'active'
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for voter restore', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'status',
          {
            entityData: {
              voterId: restoredVoter.voter_id,
              voterName: voterName,
              oldStatus: 'archived',
              newStatus: 'active',
              restoredBy: userId
            },
            user: {
              id: userId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        logger.error('Voter restore notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter restored successfully',
      data: restoredVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error restoring voter', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to restore voter');
  } finally {
    client.release();
  }
};

/**
 * Hard delete voter (permanent removal)
 * DELETE /api/voters/:id/hard-delete
 */
const hardDeleteVoter = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const userId = req.user?.lydo_id || req.user?.lydoId;

    await client.query('BEGIN');

    // Check if voter exists
    const checkQuery = 'SELECT * FROM "Voters_List" WHERE voter_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    const voter = checkResult.rows[0];
    const voterName = `${voter.last_name}, ${voter.first_name}`;

    // Permanently delete the voter record
    const deleteQuery = 'DELETE FROM "Voters_List" WHERE voter_id = $1 RETURNING *';
    const deleteResult = await client.query(deleteQuery, [id]);

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    await client.query('COMMIT');

    // Create audit log for hard delete
    try {
      await createAuditLog({
        userId: userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Delete',
        resource: '/api/voters',
        resourceId: id,
        resourceName: voterName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          voterId: id,
          voterName: voterName,
          deletionType: 'hard_delete',
          permanent: true
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for voter hard delete', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'status',
          {
            entityData: {
              voterId: id,
              voterName: voterName,
              deletionType: 'hard_delete',
              deletedBy: userId
            },
            user: {
              id: userId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        logger.error('Voter hard delete notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter permanently deleted successfully',
      data: {
        voterId: id,
        voterName: voterName
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error hard deleting voter', { error: error.message, stack: error.stack });
    
    // Check if error is due to foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete voter: Voter has related records (e.g., survey responses). Please archive instead.',
        error: 'Foreign key constraint violation'
      });
    }
    
    handleError(res, error, 'Failed to permanently delete voter');
  } finally {
    client.release();
  }
};

// === BULK OPERATIONS ===

/**
 * Bulk update voter status (archive/restore)
 * POST /api/voters/bulk
 */
const bulkUpdateStatus = async (req, res) => {
  const client = await getClient();
  
  try {
    const { ids, action } = req.body || {};
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request: ids must be a non-empty array' 
      });
    }
    
    if (!['archive', 'restore'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid action: must be "archive" or "restore"' 
      });
    }

    await client.query('BEGIN');
    
    let updateSQL;
    const results = [];
    const errors = [];
    
    if (action === 'archive') {
      updateSQL = `UPDATE "Voters_List" SET is_active = FALSE, updated_at = NOW() WHERE voter_id = $1 AND is_active = TRUE RETURNING voter_id, first_name, last_name, is_active`;
    } else if (action === 'restore') {
      updateSQL = `UPDATE "Voters_List" SET is_active = TRUE, updated_at = NOW() WHERE voter_id = $1 AND is_active = FALSE RETURNING voter_id, first_name, last_name, is_active`;
    }

    for (const id of ids) {
      try {
        const result = await client.query(updateSQL, [id]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          results.push({
            voter_id: row.voter_id,
            name: `${row.first_name} ${row.last_name}`,
            is_active: row.is_active
          });
        }
      } catch (err) {
        logger.error(`Failed to ${action} voter ${id}`, { error: err.message, stack: err.stack });
        errors.push({ id, error: err.message });
      }
    }

    await client.query('COMMIT');

    // Log bulk operation activity
    const bulkAction = action.charAt(0).toUpperCase() + action.slice(1); // Capitalize first letter
    const resourceName = `Voter Bulk ${bulkAction} - ${results.length} ${results.length === 1 ? 'voter' : 'voters'}`;
    
    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.lydo_id || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: `Bulk ${bulkAction}`,
        resource: '/api/voters/bulk',
        resourceId: null,
        resourceName: resourceName,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          totalItems: ids.length,
          successCount: results.length,
          errorCount: errors.length,
          action: action
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: errors.length === 0 ? 'success' : (results.length > 0 ? 'partial' : 'error')
      });
    } catch (logError) {
      logger.error('Failed to log activity for bulk operation', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    return res.json({
      success: true,
      message: `Bulk ${action} completed`,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      voters: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in bulk status update', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to process bulk status update');
  } finally {
    client.release();
  }
};

/**
 * Bulk import voters from CSV/Excel file
 * POST /api/voters/bulk/import
 */
const bulkImportVoters = async (req, res) => {
  const client = await getClient();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    let userId = req.user?.lydo_id || req.user?.lydoId || req.user?.userId || req.user?.id;

    logger.info(`Processing voter bulk import file: ${file.originalname}`);

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

    // Resolve createdBy (LYDO ID) similar to single create
    if (!userId && req.user?.email) {
      try {
        const lookup = await query('SELECT lydo_id FROM "LYDO" WHERE LOWER(email) = LOWER($1) AND is_active = true', [req.user.email]);
        userId = lookup.rows?.[0]?.lydo_id || null;
      } catch (_) {
        // ignore
      }
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing LYDO ID for creator. Please re-login and try again.' });
    }

    // Determine duplicate handling strategy
    const allowedStrategies = ['skip', 'update', 'restore'];
    const duplicateStrategyRaw = (req.body?.duplicateStrategy || 'skip').toString().toLowerCase();
    const duplicateStrategy = allowedStrategies.includes(duplicateStrategyRaw) ? duplicateStrategyRaw : 'skip';

    // Parse file content
    let records = [];
    
    if (file.mimetype === 'text/csv') {
      records = await parseCSVFile(file.buffer);
    } else {
      records = await parseExcelFile(file.buffer);
    }

    logger.info(`Parsed ${records.length} records from file`);

    // Validate records (structure + duplicate detection)
    const validationResult = await validateBulkImport(records);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Bulk import validation failed',
        summary: validationResult.summary,
        rows: validationResult.rows,
        errors: validationResult.errors
      });
    }

    const validatedRows = validationResult.rows;

    await client.query('BEGIN');

    const results = {
      total: validatedRows.length,
      created: 0,
      updated: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
      rows: [],
      errors: []
    };

    for (const rowInfo of validatedRows) {
      const record = rowInfo.normalized;
      const rowOutcome = {
        rowNumber: rowInfo.rowNumber,
        data: record,
        validationStatus: rowInfo.status,
        validationIssues: rowInfo.issues,
        duplicate: rowInfo.duplicate,
        action: null,
        message: ''
      };

      try {
        if (rowInfo.status === 'error') {
          results.failed++;
          rowOutcome.action = 'invalid';
          rowOutcome.message = 'Skipped due to validation errors';
          results.errors.push({ row: rowInfo.rowNumber, reason: 'Validation errors', issues: rowInfo.issues, data: record });
          results.rows.push(rowOutcome);
          continue;
        }

        // Skip secondary duplicates within the same file
        if (rowInfo.duplicate.inFile && !rowInfo.duplicate.isPrimaryInFile) {
          results.skipped++;
          rowOutcome.action = 'skipped';
          rowOutcome.message = 'Skipped duplicate row within the uploaded file';
          results.errors.push({ row: rowInfo.rowNumber, reason: 'Duplicate in file', data: record });
          results.rows.push(rowOutcome);
          continue;
        }

        const existingActive = rowInfo.existingMatches?.find(match => match.is_active);
        const existingArchived = rowInfo.existingMatches?.find(match => !match.is_active);

        const performUpdate = async (existingMatch, makeActive) => {
          const updateQuery = `
            UPDATE "Voters_List"
            SET first_name = $1,
                last_name = $2,
                middle_name = $3,
                suffix = $4,
                birth_date = $5,
                gender = $6,
                is_active = $7,
                updated_at = NOW()
            WHERE voter_id = $8
            RETURNING voter_id
          `;
          await client.query(updateQuery, [
            record.first_name,
            record.last_name,
            record.middle_name || null,
            record.suffix || null,
            record.birth_date,
            record.gender,
            makeActive ? true : existingMatch.is_active,
            existingMatch.voter_id
          ]);
        };

        let handled = false;

        if (existingActive) {
          if (duplicateStrategy === 'update' || duplicateStrategy === 'restore') {
            await performUpdate(existingActive, existingActive.is_active);
            results.updated++;
            rowOutcome.action = 'updated';
            rowOutcome.message = 'Existing active voter updated';
            handled = true;
          }
        } else if (existingArchived) {
          if (duplicateStrategy === 'restore') {
            await performUpdate(existingArchived, true);
            results.restored++;
            rowOutcome.action = 'restored';
            rowOutcome.message = 'Archived voter restored and updated';
            handled = true;
          } else if (duplicateStrategy === 'update') {
            // Update archived record without reactivating
            await performUpdate(existingArchived, false);
            results.updated++;
            rowOutcome.action = 'updated';
            rowOutcome.message = 'Archived voter details updated (still archived)';
            handled = true;
          }
        }

        if (handled) {
          results.rows.push(rowOutcome);
          continue;
        }

        if (existingActive || existingArchived) {
          results.skipped++;
          rowOutcome.action = 'skipped';
          rowOutcome.message = duplicateStrategy === 'skip'
            ? 'Skipped duplicate voter (strategy: skip)'
            : 'Skipped duplicate voter (strategy did not apply to record status)';
          results.errors.push({
            row: rowInfo.rowNumber,
            reason: rowOutcome.message,
            data: record
          });
          results.rows.push(rowOutcome);
          continue;
        }

        // Insert new voter
        const voterId = await generateVoterId();
        const insertQuery = `
          INSERT INTO "Voters_List" (
            voter_id,
            first_name,
            last_name,
            middle_name,
            suffix,
            birth_date,
            gender,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING voter_id
        `;

        await client.query(insertQuery, [
          voterId,
          record.first_name,
          record.last_name,
          record.middle_name || null,
          record.suffix || null,
          record.birth_date,
          record.gender,
          userId
        ]);

        results.created++;
        rowOutcome.action = 'created';
        rowOutcome.message = 'New voter created';
        results.rows.push(rowOutcome);

      } catch (error) {
        logger.error(`Error importing record ${rowInfo.rowNumber}`, { error: error.message, stack: error.stack });
        results.failed++;
        rowOutcome.action = 'failed';
        rowOutcome.message = error.message || 'Unexpected error';
        results.errors.push({
          row: rowInfo.rowNumber,
          reason: rowOutcome.message,
          data: record
        });
        results.rows.push(rowOutcome);
      }
    }

    await client.query('COMMIT');

    const importedCount = results.created + results.updated + results.restored;
    const summaryParts = [];
    if (results.created) summaryParts.push(`${results.created} created`);
    if (results.updated) summaryParts.push(`${results.updated} updated`);
    if (results.restored) summaryParts.push(`${results.restored} restored`);
    if (results.skipped) summaryParts.push(`${results.skipped} skipped`);
    if (results.failed) summaryParts.push(`${results.failed} failed`);
    const summaryText = summaryParts.length ? summaryParts.join(', ') : 'No changes applied';

    // Log bulk import activity
    try {
      await createAuditLog({
        userId: userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Bulk Import',
        resource: '/api/voters/bulk/import',
        resourceId: null,
        resourceName: `Voter Bulk Import - ${importedCount} processed`,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          totalItems: results.total,
          created: results.created,
          updated: results.updated,
          restored: results.restored,
          skipped: results.skipped,
          failed: results.failed,
          duplicateStrategy,
          fileName: file.originalname
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: results.failed === 0 ? 'success' : (importedCount > 0 ? 'partial' : 'error')
      });
    } catch (logError) {
      logger.error('Failed to log activity for bulk import', { error: logError.message, stack: logError.stack });
    }

    // Send bulk import completion notification
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'import',
          {},
          {
            id: userId,
            userType: req.user?.userType || req.user?.user_type || 'admin'
          },
          {
            importSummary: {
              totalRows: results.total,
              importedRecords: importedCount,
              errors: results.failed,
              skipped: results.skipped
            }
          }
        );
      } catch (notifError) {
        logger.error('Bulk import notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    res.json({
      success: true,
      message: `Bulk import completed. ${importedCount}/${results.total} processed (${summaryText}).`,
      data: results,
      summary: {
        total: results.total,
        created: results.created,
        updated: results.updated,
        restored: results.restored,
        skipped: results.skipped,
        failed: results.failed
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in bulk import', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to process bulk import');
  } finally {
    client.release();
  }
};

/**
 * Validate bulk import file and return preview
 * POST /api/voters/bulk/validate
 */
const validateBulkImportFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    logger.debug(`Validating voter bulk import file: ${file.originalname}`);

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

    // Parse file content
    let records = [];
    
    if (file.mimetype === 'text/csv') {
      records = await parseCSVFile(file.buffer);
    } else {
      records = await parseExcelFile(file.buffer);
    }

    logger.debug(`Parsed ${records.length} records for validation`);

    // Validate records
    const validationResult = await validateBulkImport(records);

    res.json({
      success: true,
      data: {
        ...validationResult,
        preview: validationResult.rows.slice(0, 10)
      }
    });

  } catch (error) {
    logger.error('Error validating bulk import', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to validate bulk import file');
  }
};

/**
 * Export voters to CSV/Excel
 * GET /api/voters/export
 */
const exportVoters = async (req, res) => {
  try {
    const { format = 'csv', status = 'active', selectedIds } = req.query;
    
    logger.debug('Export request', { format, status, selectedIds });

    // Build WHERE clause
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (status === 'active') {
      whereConditions.push(`is_active = true`);
    } else if (status === 'archived') {
      whereConditions.push(`is_active = false`);
    }

    // Handle selected IDs for bulk export
    if (selectedIds) {
      const idsArray = Array.isArray(selectedIds) ? selectedIds : selectedIds.split(',');
      const sanitizedIds = idsArray.map(id => String(id).trim()).filter(id => id.length > 0);
      if (sanitizedIds.length > 0) {
        const placeholders = sanitizedIds.map((_, index) => `$${queryParams.length + index + 1}`).join(',');
        whereConditions.push(`voter_id IN (${placeholders})`);
        queryParams.push(...sanitizedIds);
      }
    }

    const whereClause = whereConditions.join(' AND ');
    logger.debug('WHERE clause', { whereClause });

    // Get all voters
    const queryText = `
      SELECT 
        voter_id,
        first_name,
        last_name,
        middle_name,
        suffix,
        birth_date,
        gender,
        is_active,
        created_at,
        updated_at
      FROM "Voters_List"
      WHERE ${whereClause}
      ORDER BY last_name, first_name
    `;

    logger.debug('Query text', { queryText });
    const result = await query(queryText, queryParams);
    const voters = result.rows;
    
    logger.debug('Query result', { rowCount: voters.length, sampleVoters: voters.slice(0, 2) });

    // Determine export type and format
    const actualFormat = format === 'xlsx' ? 'xlsx' : format;
    const exportType = selectedIds ? 'selected' : status;
    const count = voters.length;
    const action = selectedIds ? 'Bulk Export' : 'Export';

    // Log export activity
    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.lydo_id || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: action,
        resource: '/api/voters/export',
        resourceId: null,
        resourceName: `Voter Export - ${actualFormat.toUpperCase()} (${count} ${count === 1 ? 'voter' : 'voters'})`,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          format: actualFormat,
          count: count,
          exportType: exportType
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for voter export', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = ['Voter ID', 'First Name', 'Last Name', 'Middle Name', 'Suffix', 'Birth Date', 'Gender', 'Status', 'Created At'];
      const csvData = voters.map(voter => [
        voter.voter_id,
        voter.first_name,
        voter.last_name,
        voter.middle_name || '',
        voter.suffix || '',
        voter.birth_date,
        voter.gender,
        voter.is_active ? 'Active' : 'Archived',
        voter.created_at
      ]);

      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="voters_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } else {
      // Return JSON for other formats
      res.json({
        success: true,
        data: voters,
        total: voters.length
      });
    }

  } catch (error) {
    logger.error('Error exporting voters', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to export voters');
  }
};

/**
 * Get bulk import template
 * GET /api/voters/bulk/template
 */
const getBulkImportTemplate = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const templateData = [
      {
        first_name: 'Juan',
        last_name: 'Santos',
        middle_name: 'Dela',
        suffix: 'Jr.',
        birth_date: '1995-05-15',
        gender: 'Male'
      },
      {
        first_name: 'Maria',
        last_name: 'Reyes',
        middle_name: '',
        suffix: '',
        birth_date: '1998-12-20',
        gender: 'Female'
      }
    ];

    if (format === 'csv') {
      const headers = ['first_name', 'last_name', 'middle_name', 'suffix', 'birth_date', 'gender'];
      const csvContent = [
        headers.join(','),
        ...templateData.map(row => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="voter_import_template.csv"');
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: templateData,
        headers: ['first_name', 'last_name', 'middle_name', 'suffix', 'birth_date', 'gender']
      });
    }

  } catch (error) {
    logger.error('Error generating template', { error: error.message, stack: error.stack });
    handleError(res, error, 'Failed to generate template');
  }
};

export default {
  getVoters,
  getVoterById,
  createVoter,
  updateVoter,
  deleteVoter,
  restoreVoter,
  hardDeleteVoter,
  bulkUpdateStatus,
  bulkImportVoters,
  validateBulkImportFile,
  exportVoters,
  getBulkImportTemplate
};