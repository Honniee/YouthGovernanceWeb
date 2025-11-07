import { query, getClient } from '../config/database.js';
import { generateVoterId } from '../utils/idGenerator.js';
import { validateVoterCreation, validateVoterUpdate, validateBulkImport, checkVoterExists } from '../utils/voterValidation.js';
import { handleError } from '../services/errorService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import universalNotificationService from '../services/universalNotificationService.js';
import { parseCSVFile, parseExcelFile } from '../utils/fileParser.js';

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

    // Build WHERE clause
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(LOWER(first_name) LIKE LOWER($${paramIndex}) OR LOWER(last_name) LIKE LOWER($${paramIndex}) OR LOWER(voter_id) LIKE LOWER($${paramIndex}))`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (gender) {
      whereConditions.push(`gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    // Handle age range filtering
    if (ageRange) {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      switch (ageRange) {
        case '15-17':
          whereConditions.push(`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 15 AND 17`);
          break;
        case '18-24':
          whereConditions.push(`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 18 AND 24`);
          break;
        case '25-30':
          whereConditions.push(`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 25 AND 30`);
          break;
      }
    }

    // Handle date created filtering
    if (dateCreated) {
      whereConditions.push(`DATE(created_at) >= $${paramIndex}`);
      queryParams.push(dateCreated);
      paramIndex++;
    }

    // Handle status filtering (active/archived)
    if (status === 'active') {
      whereConditions.push(`is_active = true`);
    } else if (status === 'archived') {
      whereConditions.push(`is_active = false`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort fields
    const allowedSortFields = ['last_name', 'first_name', 'gender', 'birth_date', 'created_at', 'voter_id'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'last_name';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Voters_List"
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data with participation status
    // Match voters with youth profiles by name + birth_date + gender, then check if they have survey responses
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
        v.created_by,
        -- Check if voter has participated (has survey responses)
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM "Youth_Profiling" yp
            INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
            WHERE LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
              AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
              AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
              AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) OR (yp.suffix IS NULL AND v.suffix IS NULL))
              AND yp.birth_date = v.birth_date
              AND yp.gender = v.gender
          ) THEN true
          ELSE false
        END as has_participated,
        -- Get count of survey responses
        (
          SELECT COUNT(*)
          FROM "Youth_Profiling" yp
          INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
          WHERE LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
            AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
            AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
            AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) OR (yp.suffix IS NULL AND v.suffix IS NULL))
            AND yp.birth_date = v.birth_date
            AND yp.gender = v.gender
        ) as survey_count,
        -- Get first survey date
        (
          SELECT MIN(ksr.created_at)
          FROM "Youth_Profiling" yp
          INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
          WHERE LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
            AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
            AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
            AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) OR (yp.suffix IS NULL AND v.suffix IS NULL))
            AND yp.birth_date = v.birth_date
            AND yp.gender = v.gender
        ) as first_survey_date
      FROM "Voters_List" v
      WHERE ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const dataResult = await query(dataQuery, queryParams);

    // Filter by participation status if specified
    let filteredData = dataResult.rows;
    if (hasParticipated === 'true') {
      filteredData = filteredData.filter(v => v.has_participated === true);
    } else if (hasParticipated === 'false') {
      filteredData = filteredData.filter(v => v.has_participated === false);
    }

    // Calculate statistics including participation stats
    const statsQuery = `
      WITH voter_participation AS (
        SELECT 
          v.voter_id,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM "Youth_Profiling" yp
              INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
              WHERE LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
                AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
                AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
                AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) OR (yp.suffix IS NULL AND v.suffix IS NULL))
                AND yp.birth_date = v.birth_date
                AND yp.gender = v.gender
            ) THEN true
            ELSE false
          END as has_participated
        FROM "Voters_List" v
      )
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN v.is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN v.is_active = false THEN 1 END) as archived,
        COUNT(CASE WHEN vp.has_participated = true THEN 1 END) as has_participated_count,
        COUNT(CASE WHEN vp.has_participated = false THEN 1 END) as not_participated_count
      FROM "Voters_List" v
      LEFT JOIN voter_participation vp ON v.voter_id = vp.voter_id
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: filteredData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: hasParticipated ? filteredData.length : total,
        totalPages: Math.ceil((hasParticipated ? filteredData.length : total) / limit)
      },
      stats: {
        ...stats,
        has_participated_count: parseInt(stats.has_participated_count) || 0,
        not_participated_count: parseInt(stats.not_participated_count) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching voters:', error);
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
        voter_id,
        first_name,
        last_name,
        middle_name,
        suffix,
        birth_date,
        gender,
        is_active,
        created_at,
        updated_at,
        created_by
      FROM "Voters_List"
      WHERE voter_id = $1
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
    console.error('Error fetching voter:', error);
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
      console.error('❌ Failed to log activity for voter creation:', logError);
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
        console.error('Voter creation notification error:', notifError);
      }
    }, 100);

    res.status(201).json({
      success: true,
      message: 'Voter created successfully',
      data: newVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating voter:', error);
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
        console.error('Failed to lookup user_id:', userError);
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
      console.log('✅ Voter update audit log created');
    } catch (logError) {
      console.error('❌ Failed to log activity for voter update:', logError);
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
        console.error('Voter update notification error:', notifError);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter updated successfully',
      data: updatedVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating voter:', error);
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
      console.error('❌ Failed to log activity for voter archive:', logError);
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
        console.error('Voter archive notification error:', notifError);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter archived successfully',
      data: deletedVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving voter:', error);
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
      console.error('❌ Failed to log activity for voter restore:', logError);
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
        console.error('Voter restore notification error:', notifError);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Voter restored successfully',
      data: restoredVoter
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring voter:', error);
    handleError(res, error, 'Failed to restore voter');
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
        console.error(`❌ Failed to ${action} voter ${id}:`, err);
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
      console.error('❌ Failed to log activity for bulk operation:', logError);
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
    console.error('Error in bulk status update:', error);
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

    console.log('📁 Processing voter bulk import file:', file.originalname);

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

    // Parse file content
    let records = [];
    
    if (file.mimetype === 'text/csv') {
      records = await parseCSVFile(file.buffer);
    } else {
      records = await parseExcelFile(file.buffer);
    }

    console.log(`📊 Parsed ${records.length} records from file`);

    // Validate records
    const validationResult = validateBulkImport(records);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Bulk import validation failed',
        errors: validationResult.errors,
        suggestions: validationResult.suggestions
      });
    }

    await client.query('BEGIN');

    // Process records with individual transactions
    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Skip duplicates that already exist in the database (same name + birth_date)
        const exists = await checkVoterExists(record.first_name, record.last_name, record.birth_date);
        if (exists) {
          results.failed++;
          results.errors.push({ row: i + 1, error: 'Duplicate voter already exists (same name and birth date)', data: record });
          continue;
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
          record.first_name,
          record.last_name,
          record.middle_name || null,
          record.suffix || null,
          record.birth_date,
          record.gender,
          userId
        ];

        const result = await client.query(insertQuery, insertParams);
        const newVoter = result.rows[0];

        // Don't log individual voters - we'll log the bulk operation at the end
        results.successful++;

      } catch (error) {
        console.error(`Error importing record ${i + 1}:`, error);
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: record
        });
      }
    }

    await client.query('COMMIT');

    // Log bulk import activity
    try {
      await createAuditLog({
        userId: userId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Bulk Import',
        resource: '/api/voters/bulk/import',
        resourceId: null,
        resourceName: `Voter Bulk Import - ${results.successful} ${results.successful === 1 ? 'voter' : 'voters'}`,
        resourceType: 'voter',
        details: {
          resourceType: 'voter',
          totalItems: results.total,
          successCount: results.successful,
          errorCount: results.failed,
          fileName: file.originalname
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: results.failed === 0 ? 'success' : (results.successful > 0 ? 'partial' : 'error')
      });
    } catch (logError) {
      console.error('❌ Failed to log activity for bulk import:', logError);
      // Don't fail the request if logging fails
    }

    // Send bulk import completion notification
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'bulk_import',
          {
            entityData: {
              totalRecords: results.total,
              successfulImports: results.successful,
              failedImports: results.failed,
              importedBy: userId
            },
            user: {
              id: userId,
              userType: req.user?.userType || req.user?.user_type || 'admin'
            }
          }
        );
      } catch (notifError) {
        console.error('Bulk import notification error:', notifError);
      }
    }, 100);

    res.json({
      success: true,
      message: `Bulk import completed. ${results.successful} successful, ${results.failed} failed.`,
      data: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk import:', error);
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
    console.log('🔍 Validating voter bulk import file:', file.originalname);

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

    console.log(`📊 Parsed ${records.length} records for validation`);

    // Validate records
    const validationResult = validateBulkImport(records);

    res.json({
      success: true,
      data: {
        totalRecords: records.length,
        validRecords: validationResult.isValid ? records.length : records.length - validationResult.errors.length,
        invalidRecords: validationResult.errors.length,
        preview: records.slice(0, 10), // First 10 records as preview
        errors: validationResult.errors,
        suggestions: validationResult.suggestions
      }
    });

  } catch (error) {
    console.error('Error validating bulk import:', error);
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
    
    console.log('🔍 Export request:', { format, status, selectedIds });

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
    console.log('🔍 WHERE clause:', whereClause);

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

    console.log('🔍 Query text:', queryText);
    const result = await query(queryText, queryParams);
    const voters = result.rows;
    
    console.log('🔍 Query result:', { rowCount: voters.length, voters: voters.slice(0, 2) });

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
      console.error('❌ Failed to log activity for voter export:', logError);
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
    console.error('Error exporting voters:', error);
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
    console.error('Error generating template:', error);
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
  bulkUpdateStatus,
  bulkImportVoters,
  validateBulkImportFile,
  exportVoters,
  getBulkImportTemplate
};