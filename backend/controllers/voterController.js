import { query, getClient } from '../config/database.js';
import { generateVoterId } from '../utils/idGenerator.js';
import { validateVoterCreation, validateVoterUpdate, validateBulkImport, checkVoterExists } from '../utils/voterValidation.js';
import { handleError } from '../services/errorService.js';
import universalAuditService from '../services/universalAuditService.js';
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
      status = 'active'
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

    // Get paginated data
    const dataQuery = `
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
      WHERE ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const dataResult = await query(dataQuery, queryParams);

    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as archived
      FROM "Voters_List"
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
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

    // Create audit log
    await universalAuditService.logCreation(
      'voters',
      newVoter.voter_id,
      newVoter,
      universalAuditService.createUserContext(req)
    );

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'creation',
          {
            entityData: {
              voterId: newVoter.voter_id,
              voterName: `${newVoter.last_name}, ${newVoter.first_name}`,
              createdBy: userId
            },
            user: universalAuditService.createUserContext(req)
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

    // Create audit log
    await universalAuditService.logUpdate(
      'voters',
      updatedVoter.voter_id,
      oldVoter,
      updatedVoter,
      universalAuditService.createUserContext(req)
    );

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'update',
          {
            entityData: {
              voterId: updatedVoter.voter_id,
              voterName: `${updatedVoter.last_name}, ${updatedVoter.first_name}`,
              updatedBy: userId
            },
            user: universalAuditService.createUserContext(req)
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

    // Create audit log
    await universalAuditService.logStatusChange(
      'voters',
      deletedVoter.voter_id,
      'active',
      'archived',
      universalAuditService.createUserContext(req)
    );

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'status',
          {
            entityData: {
              voterId: deletedVoter.voter_id,
              voterName: `${deletedVoter.last_name}, ${deletedVoter.first_name}`,
              oldStatus: 'active',
              newStatus: 'archived',
              archivedBy: userId
            },
            user: universalAuditService.createUserContext(req)
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

    // Create audit log
    await universalAuditService.logStatusChange(
      'voters',
      restoredVoter.voter_id,
      'archived',
      'active',
      universalAuditService.createUserContext(req)
    );

    // Send notification to admins
    setTimeout(async () => {
      try {
        await universalNotificationService.sendNotificationAsync(
          'voters',
          'status',
          {
            entityData: {
              voterId: restoredVoter.voter_id,
              voterName: `${restoredVoter.last_name}, ${restoredVoter.first_name}`,
              oldStatus: 'archived',
              newStatus: 'active',
              restoredBy: userId
            },
            user: universalAuditService.createUserContext(req)
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

        // Create audit log for each voter
        await universalAuditService.logCreation(
          'voters',
          newVoter.voter_id,
          newVoter,
          universalAuditService.createUserContext(req)
        );

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
            user: universalAuditService.createUserContext(req)
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
    const { format = 'csv', status = 'active' } = req.query;
    
    console.log('🔍 Export request:', { format, status });

    // Build WHERE clause
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (status === 'active') {
      whereConditions.push(`is_active = true`);
    } else if (status === 'archived') {
      whereConditions.push(`is_active = false`);
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
  bulkImportVoters,
  validateBulkImportFile,
  exportVoters,
  getBulkImportTemplate
};

