/**
 * Youth Controller
 * Handles youth-related operations including validated youth management
 */

import { getClient } from '../config/database.js';
import { createAuditLog } from '../middleware/auditLogger.js';

/**
 * Get validated youth (youth who have validated survey responses)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getValidatedYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    console.log('🔍 Fetching validated youth from database...');
    
    // Extract pagination and filter parameters
    const {
      page = 1,
      limit = 50000, // Default to high limit to fetch all records
      search = '',
      status = '',
      barangay = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    const limitValue = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitValue;
    
    // If limit is very high (>= 100000), fetch all records without LIMIT clause
    const fetchAll = limitValue >= 100000;
    
    // Optimized query using window functions and CTEs instead of LATERAL JOINs
    // This is much faster as it avoids N+1 subqueries and uses efficient aggregations
    let queryParams = [];
    let paramCount = 0;
    
    // Build base query with CTEs
    let baseQuery = `
      WITH validated_youth_base AS (
        SELECT DISTINCT ON (yp.youth_id)
          yp.youth_id,
          yp.first_name,
          yp.last_name,
          yp.middle_name,
          yp.suffix,
          yp.region,
          yp.province,
          yp.municipality,
          yp.barangay_id,
          b.barangay_name,
          yp.purok_zone,
          yp.birth_date,
          yp.age,
          yp.gender,
          yp.contact_number,
          yp.email,
          yp.is_active,
          yp.created_at,
          yp.updated_at,
        yp.validation_tier,
        yp.validation_status,
          ksr.validation_status,
          ksr.validation_date,
          ksr.validated_by,
          CASE WHEN vl.voter_id IS NOT NULL THEN true ELSE false END as is_in_voters_list
        FROM "Youth_Profiling" yp
        INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        LEFT JOIN "Voters_List" vl ON 
          yp.first_name = vl.first_name 
          AND yp.last_name = vl.last_name 
          AND (yp.middle_name = vl.middle_name OR (yp.middle_name IS NULL AND vl.middle_name IS NULL))
          AND (yp.suffix = vl.suffix OR (yp.suffix IS NULL AND vl.suffix IS NULL))
          AND yp.birth_date = vl.birth_date 
          AND yp.gender = vl.gender
          AND vl.is_active = true
        WHERE ksr.validation_status = 'validated'
        ORDER BY yp.youth_id, ksr.validation_date DESC NULLS LAST, ksr.created_at DESC
      ),
      survey_stats AS (
        SELECT 
          youth_id,
          COUNT(*) as surveys_completed,
          MAX(created_at) as last_survey_date
        FROM "KK_Survey_Responses"
        WHERE validation_status = 'validated'
        GROUP BY youth_id
      ),
      youth_with_counts AS (
        SELECT 
          base.*,
          COALESCE(stats.surveys_completed, 0) as surveys_completed,
          stats.last_survey_date
        FROM validated_youth_base base
        LEFT JOIN survey_stats stats ON base.youth_id = stats.youth_id
      )
      SELECT *
      FROM youth_with_counts
      WHERE 1=1
    `;
    
    // Add search filter
    if (search && search.trim()) {
      paramCount++;
      baseQuery += ` AND (
        first_name ILIKE $${paramCount} OR 
        last_name ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR
        barangay_name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search.trim()}%`);
    }
    
    // Add barangay filter
    if (barangay && barangay.trim()) {
      paramCount++;
      baseQuery += ` AND barangay_name = $${paramCount}`;
      queryParams.push(barangay.trim());
    }
    
    // Add sorting
    const validSortBy = ['created_at', 'first_name', 'last_name', 'email', 'validation_date'].includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
    baseQuery += ` ORDER BY ${validSortBy} ${validSortOrder}`;
    
    // Add pagination only if not fetching all records
    if (!fetchAll) {
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      queryParams.push(limitValue);
      if (offset > 0) {
        paramCount++;
        baseQuery += ` OFFSET $${paramCount}`;
        queryParams.push(offset);
      }
    }
    
    // Get total count for pagination (optimized separate query)
    let countQuery = `
      SELECT COUNT(DISTINCT yp.youth_id) as total
      FROM "Youth_Profiling" yp
      INNER JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE ksr.validation_status = 'validated'
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (search && search.trim()) {
      countParamCount++;
      countQuery += ` AND (
        yp.first_name ILIKE $${countParamCount} OR 
        yp.last_name ILIKE $${countParamCount} OR 
        yp.email ILIKE $${countParamCount} OR
        b.barangay_name ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search.trim()}%`);
    }
    
    if (barangay && barangay.trim()) {
      countParamCount++;
      countQuery += ` AND b.barangay_name = $${countParamCount}`;
      countParams.push(barangay.trim());
    }
    
    // Execute both queries in parallel for better performance
    const [result, countResult] = await Promise.all([
      client.query(baseQuery, queryParams),
      client.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0]?.total || 0);
    console.log(`✅ Found ${result.rows.length} validated youth (total: ${total})`);
    
    // Transform the data for frontend (age calculation moved to SQL for better performance)
    const validatedYouth = result.rows.map(row => {
      // Calculate current age from birth_date
      const today = new Date();
      const birthDate = new Date(row.birth_date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Determine status based on age and is_active
      let status, eligibilityStatus;
      if (!row.is_active) {
        status = 'archived';
        eligibilityStatus = 'archived';
      } else if (age >= 30) {
        status = 'age_out';
        eligibilityStatus = 'age_out';
      } else if (age >= 28) {
        status = 'age_warning';
        eligibilityStatus = 'age_warning';
      } else {
        status = 'active';
        eligibilityStatus = 'eligible';
      }
      
      return {
        id: row.youth_id,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        suffix: row.suffix,
        email: row.email,
        phone: row.contact_number,
        age: age,
        birthday: row.birth_date,
        barangay: row.barangay_name || row.barangay_id,
        address: `${row.purok_zone || ''} ${row.barangay_name || row.barangay_id}`.trim(),
        status: status,
        eligibilityStatus: eligibilityStatus,
        validatedAt: row.validation_date,
        validatedBy: row.validated_by || 'System',
        validationTier: row.validation_tier,
      validationStatus: row.validation_status,
        lastSurveyDate: row.last_survey_date,
        surveysCompleted: parseInt(row.surveys_completed) || 0,
        isInVotersList: row.is_in_voters_list || false,
        profilePicture: null,
        createdAt: row.created_at,
        region: row.region,
        province: row.province,
        municipality: row.municipality,
        gender: row.gender,
        isActive: row.is_active
      };
    });
    
    res.json({
      success: true,
      data: validatedYouth,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitValue),
        totalItems: total,
        itemsPerPage: limitValue,
        hasNextPage: offset + limitValue < total,
        hasPrevPage: offset > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching validated youth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch validated youth',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get youth statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getYouthStats = async (req, res) => {
  const client = await getClient();
  
  try {
    console.log('📊 Fetching youth statistics...');
    
    // Get age distribution and status counts
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN yp.age >= 15 AND yp.age <= 27 THEN 1 END) as active,
        COUNT(CASE WHEN yp.age >= 28 AND yp.age <= 29 THEN 1 END) as age_warning,
        COUNT(CASE WHEN yp.age >= 30 THEN 1 END) as age_out,
        COUNT(CASE WHEN yp.age >= 15 AND yp.age <= 20 THEN 1 END) as age_15_20,
        COUNT(CASE WHEN yp.age >= 21 AND yp.age <= 25 THEN 1 END) as age_21_25,
        COUNT(CASE WHEN yp.age >= 26 AND yp.age <= 29 THEN 1 END) as age_26_29,
        COUNT(CASE WHEN yp.age >= 30 THEN 1 END) as age_30_plus
      FROM "Youth_Profiling" yp
      JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
      WHERE ksr.validation_status = 'validated';
    `;
    
    const result = await client.query(statsQuery);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        ageWarning: parseInt(stats.age_warning),
        ageOut: parseInt(stats.age_out),
        ageGroups: {
          '15-20': parseInt(stats.age_15_20),
          '21-25': parseInt(stats.age_21_25),
          '26-29': parseInt(stats.age_26_29),
          '30+': parseInt(stats.age_30_plus)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching youth statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch youth statistics',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Archive a youth (set is_active = false)
 */
export const archiveYouth = async (req, res) => {
  const client = await getClient();
  const { id } = req.params;
  try {
    const result = await client.query(
      'UPDATE "Youth_Profiling" SET is_active = FALSE, updated_at = NOW() WHERE youth_id = $1 RETURNING youth_id, is_active, updated_at',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Youth not found' });
    }

    // Get youth name for logging
    const youthQuery = await client.query(
      'SELECT first_name, last_name FROM "Youth_Profiling" WHERE youth_id = $1',
      [id]
    );
    const youthName = youthQuery.rows.length > 0 
      ? `${youthQuery.rows[0].first_name} ${youthQuery.rows[0].last_name}`
      : `Youth ${id}`;

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'Archive',
      resource: '/api/youth',
      resourceId: id,
      resourceName: youthName,
      details: {
        resourceType: 'youth',
        youthId: id,
        youthName: youthName,
        newStatus: 'archived'
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error archiving youth:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive youth', error: error.message });
  } finally {
    client.release();
  }
};

/**
 * Unarchive a youth (set is_active = true)
 */
export const unarchiveYouth = async (req, res) => {
  const client = await getClient();
  const { id } = req.params;
  try {
    const result = await client.query(
      'UPDATE "Youth_Profiling" SET is_active = TRUE, updated_at = NOW() WHERE youth_id = $1 RETURNING youth_id, is_active, updated_at',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Youth not found' });
    }

    // Get youth name and age for logging
    const youthQuery = await client.query(
      'SELECT first_name, last_name, birth_date FROM "Youth_Profiling" WHERE youth_id = $1',
      [id]
    );
    const youthRow = youthQuery.rows[0];
    const youthName = youthRow 
      ? `${youthRow.first_name} ${youthRow.last_name}`
      : `Youth ${id}`;
    
    // Calculate age to determine status
    let derivedStatus = 'active';
    if (youthRow && youthRow.birth_date) {
      const today = new Date();
      const birthDate = new Date(youthRow.birth_date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 30) {
        derivedStatus = 'archived';
      } else if (age >= 28) {
        derivedStatus = 'age_warning';
      }
    }

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'Unarchive',
      resource: '/api/youth',
      resourceId: id,
      resourceName: youthName,
      details: {
        resourceType: 'youth',
        youthId: id,
        youthName: youthName,
        newStatus: 'active',
        derivedStatus: derivedStatus
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error unarchiving youth:', error);
    return res.status(500).json({ success: false, message: 'Failed to unarchive youth', error: error.message });
  } finally {
    client.release();
  }
};

/**
 * Export youth data (logging endpoint for activity logs)
 * Since exports are done client-side, this endpoint just logs the activity
 */
export const exportYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    const { format = 'json', selectedIds, logFormat, count: providedCount, tab } = req.query;
    // logFormat is the actual format exported (for logging), format is the response format
    const actualFormat = logFormat || format;
    
    console.log('🔍 Youth export request received:', { format, actualFormat, selectedIds, providedCount, tab, queryParams: req.query });
    
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid export format. Use "csv", "json", or "pdf"' 
      });
    }

    // Use provided count if available (from filtered dataset), otherwise count from database
    let count = 0;
    let exportType = 'all';
    
    if (providedCount) {
      // Use the count provided by frontend (filtered dataset length)
      count = parseInt(providedCount);
      exportType = tab ? `tab:${tab}` : 'filtered';
    } else if (selectedIds && selectedIds.length > 0) {
      const idsArray = Array.isArray(selectedIds) ? selectedIds : selectedIds.split(',');
      const sanitizedIds = idsArray
        .map(id => String(id).trim())
        .filter(id => id.length > 0);
      
      if (sanitizedIds.length > 0) {
        const placeholders = sanitizedIds.map((_, index) => `$${index + 1}`).join(',');
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM "Youth_Profiling" WHERE youth_id IN (${placeholders})`,
          sanitizedIds
        );
        count = parseInt(countResult.rows[0].count);
        exportType = 'selected';
      }
    } else {
      // Count all validated youth (those with validated survey responses)
      const countResult = await client.query(`
        SELECT COUNT(DISTINCT yp.youth_id) as count
        FROM "Youth_Profiling" yp
        JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id
        WHERE ksr.validation_status = 'validated'
      `);
      count = parseInt(countResult.rows[0].count);
    }

    // Prepare audit log data
    const userId = req.user?.id || req.user?.user_id || 'SYSTEM';
    const userType = req.user?.userType || req.user?.user_type || 'admin';
    
    // Determine action: 'Bulk Export' for bulk exports (selectedIds), 'Export' for regular exports
    const action = exportType === 'selected' ? 'Bulk Export' : 'Export';
    
    // Create meaningful resource name for export
    const resourceName = `Youth Export - ${actualFormat.toUpperCase()} (${count} ${count === 1 ? 'member' : 'members'})`;
    
    console.log('🔍 Youth Export - Will create audit log with:', { userId, userType, format: actualFormat, count, resourceName, action, exportType });

    if (format === 'json') {
      // Create audit log for JSON export (await before responding)
      try {
        await createAuditLog({
          userId: userId,
          userType: userType,
          action: action,
          resource: '/api/youth/export',
          resourceId: null,
          resourceName: resourceName,
          details: {
            resourceType: 'youth',
            reportType: 'youth',
            format: actualFormat,
            count: count,
            exportType: exportType
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          status: 'success'
        });
        console.log(`✅ Youth export audit log created: JSON export of ${count} youth`);
      } catch (err) {
        console.error('❌ Youth export audit log failed:', err);
      }

      return res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        total: count,
        exportType: exportType
      });
    }

    // For CSV/PDF, just return JSON (frontend handles the actual export)
    return res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      total: count,
      exportType: exportType
    });
    
  } catch (error) {
    console.error('❌ Error in youth export:', error);
    
    // Create audit log for failed export
    const userId = req.user?.id || req.user?.user_id || 'SYSTEM';
    const userType = req.user?.userType || req.user?.user_type || 'admin';
    const resourceName = `Youth Export - Failed`;
    
    try {
      await createAuditLog({
        userId: userId,
        userType: userType,
        action: 'Export',
        resource: '/api/youth/export',
        resourceId: null,
        resourceName: resourceName,
        details: {
          resourceType: 'youth',
          error: error.message,
          exportFailed: true
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'error',
        errorMessage: error.message
      });
    } catch (err) {
      console.error('❌ Failed export audit log error:', err);
    }

    return res.status(500).json({ 
      success: false,
      message: 'Failed to log youth export',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Bulk archive/unarchive youth
 * POST /api/youth/bulk
 */
export const bulkUpdateStatus = async (req, res) => {
  const client = await getClient();
  
  try {
    const { ids, action } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request: ids must be a non-empty array' 
      });
    }
    
    if (!['archive', 'unarchive'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid action: must be "archive" or "unarchive"' 
      });
    }

    await client.query('BEGIN');
    
    let updateSQL;
    const results = [];
    const errors = [];
    
    if (action === 'archive') {
      updateSQL = `UPDATE "Youth_Profiling" SET is_active = FALSE, updated_at = NOW() WHERE youth_id = $1 RETURNING youth_id, first_name, last_name, is_active`;
    } else if (action === 'unarchive') {
      updateSQL = `UPDATE "Youth_Profiling" SET is_active = TRUE, updated_at = NOW() WHERE youth_id = $1 RETURNING youth_id, first_name, last_name, is_active`;
    }

    for (const id of ids) {
      try {
        const result = await client.query(updateSQL, [id]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          results.push({
            youth_id: row.youth_id,
            name: `${row.first_name} ${row.last_name}`,
            is_active: row.is_active
          });
        }
      } catch (err) {
        console.error(`❌ Failed to ${action} youth ${id}:`, err);
        errors.push({ id, error: err.message });
      }
    }

    await client.query('COMMIT');

    // Create audit log for bulk operation
    const bulkAction = action.charAt(0).toUpperCase() + action.slice(1); // Capitalize first letter
    const resourceName = `Youth Bulk ${bulkAction} - ${results.length} ${results.length === 1 ? 'member' : 'members'}`;
    
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: `Bulk ${bulkAction}`,
      resource: '/api/youth/bulk',
      resourceId: null,
      resourceName: resourceName,
      details: {
        resourceType: 'youth',
        totalItems: ids.length,
        successCount: results.length,
        errorCount: errors.length,
        action: action
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: errors.length === 0 ? 'success' : 'partial'
    });

    return res.json({
      success: true,
      message: `Bulk ${action} completed`,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      youth: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error in bulk ${req.body?.action || 'operation'}:`, error);
    
    // Create audit log for failed bulk operation
    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.user_id || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: `Bulk ${req.body?.action ? req.body.action.charAt(0).toUpperCase() + req.body.action.slice(1) : 'Operation'}`,
        resource: '/api/youth/bulk',
        resourceId: null,
        resourceName: `Youth Bulk Operation - Failed`,
        details: {
          resourceType: 'youth',
          error: error.message,
          bulkOperationFailed: true
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'error',
        errorMessage: error.message
      });
    } catch (logErr) {
      console.error('❌ Failed to log bulk operation error:', logErr);
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message
    });
  } finally {
    client.release();
  }
};
