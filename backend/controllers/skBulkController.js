import { query, getClient } from '../config/database.js';
import { generateSKId } from '../utils/idGenerator.js';
import { generateSKOrgEmail } from '../utils/emailGenerator.js';
import { generateSecurePassword } from '../utils/passwordGenerator.js';
import { sanitizeInput } from '../utils/validation.js';
import bcrypt from 'bcryptjs';
import csv from 'csv-parser';
import { Readable } from 'stream';
import xlsx from 'xlsx';
import notificationService from '../services/notificationService.js';
import universalAuditService from '../services/universalAuditService.js';
import universalNotificationService from '../services/universalNotificationService.js';
import { createUserForSK } from '../utils/usersTableHelper.js';
import { 
  validateSKBulkOperation,
  validateBarangayExists,
  getActiveTerm,
  checkPositionConflict 
} from '../utils/skValidation.js';
import SKValidationService from '../services/skValidationService.js';
import { createAuditLog } from '../middleware/auditLogger.js';

/**
 * SK Officials Bulk Operations Controller
 * Handles bulk import, export, and batch operations for SK Officials
 * Following Staff Management architecture pattern - Individual Transactions
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

// === BULK IMPORT OPERATIONS ===

/**
 * Bulk import SK Officials from CSV/Excel file
 * POST /api/sk-officials/bulk/import
 */
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

    // Process records with INDIVIDUAL TRANSACTIONS (Staff Management pattern)
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

    // Create audit log using Universal Audit Service
    universalAuditService.logBulkImport('sk-officials', file.originalname, results.summary, universalAuditService.createUserContext(req)).catch(err => console.error('Audit log failed:', err));

    // Send admin notifications using Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-officials', 'import', {}, req.user, { importSummary: results.summary });

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

/**
 * Process SK Officials bulk import with INDIVIDUAL TRANSACTIONS
 * Following Staff Management pattern for better error handling
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

  // Process each record individually (Staff Management pattern)
  for (let i = 0; i < records.length; i++) {
    const client = await getClient(); // New client per record
    const record = records[i];
    const rowNumber = i + 2; // +2 for 1-based indexing and header row

    try {
      await client.query('BEGIN'); // Individual transaction per record

      // Validate required fields
      const validation = validateSKBulkRecord(record, rowNumber);
      if (!validation.isValid) {
        results.errors.push(...validation.errors);
        results.summary.errors += validation.errors.length;
        await client.query('ROLLBACK');
        continue;
      }

      results.summary.validRecords++;

      // Process the record
      const processed = await processSKRecord(record, rowNumber, activeTerm, client);
      
      if (processed.success) {
        // Send welcome notification to SK Official (fire-and-forget)
        setTimeout(() => {
          notificationService.sendSKWelcomeNotification({
            sk_id: processed.data.sk_id,
            first_name: processed.data.first_name,
            last_name: processed.data.last_name,
            personal_email: processed.data.personal_email,
            org_email: processed.data.email,
            position: processed.data.position,
            password: processed.tempPassword,
            barangay_name: processed.barangayName
          }).catch(err => console.error(`SK welcome notification failed for ${processed.data.sk_id}:`, err));
        }, i * 100); // Stagger emails to avoid overwhelming the email service

        // Create individual audit log using Universal Audit Service
        universalAuditService.logBulkImportIndividual('sk-officials', {
          skId: processed.data.sk_id,
          firstName: processed.data.first_name,
          lastName: processed.data.last_name,
          position: processed.data.position,
          barangayName: processed.barangayName,
          personalEmail: processed.data.personal_email
        }, currentUser, i).catch(err => console.error('Individual audit log failed:', err));

        await client.query('COMMIT');

        results.imported.push({
          skId: processed.data.sk_id,
          name: `${processed.data.first_name} ${processed.data.last_name}`,
          position: processed.data.position,
          barangay: processed.barangayName,
          email: processed.data.personal_email
        });

        results.summary.importedRecords++;
        console.log(`✅ Imported SK Official ${i + 1}/${records.length}: ${processed.data.first_name} ${processed.data.last_name}`);

      } else {
        await client.query('ROLLBACK');
        results.errors.push(processed.error);
        results.summary.errors++;
      }

    } catch (recordError) {
      await client.query('ROLLBACK');
      console.error(`❌ Error processing row ${rowNumber}:`, recordError);
      results.errors.push(`Row ${rowNumber}: Unexpected error - ${recordError.message}`);
      results.summary.errors++;
    } finally {
      client.release(); // Always release client
    }
  }

  console.log(`🎉 SK Bulk import completed: ${results.summary.importedRecords} imported, ${results.summary.errors} errors`);
  return results;
};

/**
 * Process individual SK record (similar to createSKOfficial but for bulk)
 */
const processSKRecord = async (record, rowNumber, activeTerm, client) => {
  try {
    // Support both old and new field formats for backward compatibility
    const firstName = record.firstName || record.first_name;
    const lastName = record.lastName || record.last_name;
    const middleName = record.middleName || record.middle_name;
    const personalEmail = record.personalEmail || record.personal_email;
    const barangayName = record.barangayName || record.barangay_name;
    const barangayId = record.barangay_id; // For backward compatibility

    // Sanitize data
    const sanitizedData = {
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      middleName: sanitizeString(middleName || ''),
      suffix: sanitizeString(record.suffix || ''),
      position: sanitizeString(record.position),
      personalEmail: sanitizeString(personalEmail).toLowerCase(),
      barangayName: sanitizeString(barangayName || ''),
      barangayId: sanitizeString(barangayId || '')
    };

    // Convert barangayName to barangayId if needed
    let finalBarangayId = sanitizedData.barangayId;
    
    if (sanitizedData.barangayName && !finalBarangayId) {
      // Look up barangay ID by name
      const barangayLookup = await client.query(
        'SELECT barangay_id FROM "Barangay" WHERE LOWER(barangay_name) = LOWER($1)',
        [sanitizedData.barangayName]
      );
      
      if (barangayLookup.rows.length === 0) {
        return {
          success: false,
          error: `Row ${rowNumber}: Barangay '${sanitizedData.barangayName}' not found. Please check the spelling.`
        };
      }
      
      finalBarangayId = barangayLookup.rows[0].barangay_id;
    }

    // Update sanitizedData with final barangayId
    sanitizedData.barangayId = finalBarangayId;

    // Verify barangay exists
    const barangayCheck = await validateBarangayExists(sanitizedData.barangayId, client);
    if (!barangayCheck.exists) {
      return {
        success: false,
        error: `Row ${rowNumber}: Invalid barangay ID: ${sanitizedData.barangayId}`
      };
    }

    // Check for position conflicts
    const positionConflict = await checkPositionConflict(
      sanitizedData.position,
      sanitizedData.barangayId,
      activeTerm.term_id,
      client
    );
    
    if (positionConflict.hasConflict) {
      return {
        success: false,
        error: `Row ${rowNumber}: ${positionConflict.message}`
      };
    }

    // Check if personal email already exists
    const emailCheckQuery = `
      SELECT sk_id FROM "SK_Officials" WHERE personal_email = $1
      UNION
      SELECT lydo_id FROM "LYDO" WHERE personal_email = $1
    `;
    const emailCheck = await client.query(emailCheckQuery, [sanitizedData.personalEmail]);
    
    if (emailCheck.rows.length > 0) {
      return {
        success: false,
        error: `Row ${rowNumber}: Personal email already exists: ${sanitizedData.personalEmail}`
      };
    }

    // Generate SK ID and organizational email
    let skId;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      skId = await generateSKId(client);
      
      // Check if SK ID already exists
      const idExists = await client.query('SELECT COUNT(*) AS count FROM "SK_Officials" WHERE sk_id = $1', [skId]);
      if (parseInt(idExists.rows[0].count) === 0) {
        break; // ID is unique, proceed
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        return {
          success: false,
          error: `Row ${rowNumber}: Failed to generate unique SK ID after ${maxAttempts} attempts`
        };
      }
      
      // Wait a bit before retrying to reduce race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

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
      'BULK_IMPORT'
    ];

    const result = await client.query(insertQuery, insertValues);
    const newOfficial = result.rows[0];

    // Create Users table entry
    await createUserForSK(skId, client);

    return {
      success: true,
      data: newOfficial,
      tempPassword: password,
      barangayName: barangayCheck.barangayName
    };

  } catch (error) {
    return {
      success: false,
      error: `Row ${rowNumber}: Processing failed - ${error.message}`
    };
  }
};

// === BULK STATUS OPERATIONS ===

/**
 * Bulk update status for multiple SK Officials
 * PUT /api/sk-officials/bulk/status
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const rawData = req.body || {};
    console.log('🔍 Backend SK bulk operation - Raw data:', rawData);
    
    const data = sanitizeInput(rawData);
    console.log('🔍 Backend SK bulk operation - Sanitized data:', data);

    const { isValid, errors } = validateSKBulkOperation(data.ids, data.action);
    console.log('🔍 Backend SK validation result:', { isValid, errors });
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors 
      });
    }

    const { ids, action, reason } = data;
    
    // Process each record individually (Staff Management pattern)
    const results = [];
    const processingErrors = [];
    
    for (let i = 0; i < ids.length; i++) {
      const client = await getClient();
      const id = ids[i];
      
      try {
        await client.query('BEGIN');
        
        let updateSQL, updateParams;
        
        if (action === 'activate') {
          updateSQL = `UPDATE "SK_Officials" SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE sk_id = $1 RETURNING *`;
        } else if (action === 'deactivate') {
          updateSQL = `UPDATE "SK_Officials" SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE sk_id = $1 RETURNING *`;
        } else {
          throw new Error(`Invalid bulk action: ${action}`);
        }

        const result = await client.query(updateSQL, [id]);
        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }

        await client.query('COMMIT');

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to ${action} SK Official ${id}:`, error);
        processingErrors.push(`SK Official ${id}: ${action} failed - ${error.message}`);
      } finally {
        client.release();
      }
    }

    // Send admin notifications about bulk SK operation
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        console.log('🔔 Sending bulk SK operation notification with user context:', currentUser);
        await notificationService.notifyAdminsAboutBulkSKOperation(ids, action, currentUser);
      } catch (notifError) {
        console.error('Bulk SK operation notification error:', notifError);
      }
    }, 100);

    // Create audit log using Universal Audit Service
    universalAuditService.logBulkOperation('sk-officials', action, ids, results.map(official => ({
      skId: official.sk_id,
      firstName: official.first_name,
      lastName: official.last_name,
      position: official.position
    })), universalAuditService.createUserContext(req)).catch(err => console.error('Audit log failed:', err));

    // Send admin notifications using Universal Notification Service  
    universalNotificationService.sendNotificationAsync('sk-officials', 'bulk', {}, req.user, { operation: action, entityIds: ids });

    res.json({
      success: true,
      message: `Bulk ${action} completed. ${results.length} SK Officials processed successfully.`,
      data: {
        processed: results.length,
        errors: processingErrors.length,
        results: results,
        processingErrors: processingErrors
      }
    });

  } catch (error) {
    console.error('Error in bulk SK operation:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk operation',
      error: error.message
    });
  }
};

// === BULK EXPORT OPERATIONS ===

/**
 * Get bulk import template
 * GET /api/sk-officials/bulk/template
 */
const getBulkImportTemplate = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    
    // Template data with sample SK official (updated to match frontend expectations)
    const templateData = [
      {
        firstName: 'Maria',
        lastName: 'Santos', 
        middleName: 'Cruz',
        suffix: '',
        personalEmail: 'maria.santos@gmail.com',
        position: 'SK Chairperson',
        barangayName: 'Aguila'
      },
      {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        middleName: 'Reyes',
        suffix: 'Jr.',
        personalEmail: 'juan.delacruz@yahoo.com',
        position: 'SK Secretary',
        barangayName: 'Anus'
      }
    ];

    if (format === 'csv') {
      const csvContent = convertToCSV(templateData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sk_officials_import_template.csv"');
      res.send(csvContent);
    } else if (format === 'xlsx') {
      const workbook = convertToExcel(templateData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sk_officials_import_template.xlsx"');
      res.send(workbook);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or xlsx.'
      });
    }

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

// === HELPER FUNCTIONS ===

/**
 * Parse CSV file content
 */
const parseCSVFile = async (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
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
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    return jsonData;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate SK bulk import record
 */
const validateSKBulkRecord = (record, rowNumber) => {
  const errors = [];

  // Support both old (barangay_id) and new (barangayName) field formats for backward compatibility
  const firstName = record.firstName || record.first_name;
  const lastName = record.lastName || record.last_name;
  const middleName = record.middleName || record.middle_name;
  const personalEmail = record.personalEmail || record.personal_email;
  const barangayName = record.barangayName || record.barangay_name;
  const barangayId = record.barangay_id; // For backward compatibility
  const position = record.position;

  // Required fields validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
    errors.push(`Row ${rowNumber}: First name is required`);
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') {
    errors.push(`Row ${rowNumber}: Last name is required`);
  }

  if (!position || typeof position !== 'string' || position.trim() === '') {
    errors.push(`Row ${rowNumber}: Position is required`);
  }

  // Require either barangayName OR barangay_id for backward compatibility
  if ((!barangayName || barangayName.trim() === '') && (!barangayId || barangayId.trim() === '')) {
    errors.push(`Row ${rowNumber}: Barangay name is required`);
  }

  if (!personalEmail || typeof personalEmail !== 'string' || personalEmail.trim() === '') {
    errors.push(`Row ${rowNumber}: Personal email is required`);
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalEmail.trim())) {
      errors.push(`Row ${rowNumber}: Invalid email format`);
    }
  }

  // Position validation
  const validPositions = ['SK Chairperson', 'SK Secretary', 'SK Treasurer', 'SK Councilor'];
  if (position && !validPositions.includes(position.trim())) {
    errors.push(`Row ${rowNumber}: Invalid position. Must be one of: ${validPositions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Convert data to CSV format
 */
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

/**
 * Convert data to Excel format
 */
const convertToExcel = (data) => {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'SK Officials Template');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// === BULK VALIDATION OPERATIONS ===

/**
 * Validate bulk import file and return preview
 * POST /api/sk-officials/bulk/validate
 */
const validateBulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    console.log('🔍 Validating SK bulk import file:', file.originalname);

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

    // Get active term
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

    console.log(`📊 Parsed ${records.length} records for validation`);

    // Convert records to validation format (support barangayName → barangayId resolution)
    const rawValidationRecords = records.map(record => ({
      firstName: record.firstName || record.first_name,
      lastName: record.lastName || record.last_name,
      middleName: record.middleName || record.middle_name,
      personalEmail: record.personalEmail || record.personal_email,
      barangayId: record.barangayId || record.barangay_id,
      barangayName: record.barangayName || record.barangay_name,
      position: record.position
    }));

    const validationRecords = await resolveBarangayIds(rawValidationRecords);

    // Validate records using SKValidationService
    const validationResult = await SKValidationService.getImportPreview(validationRecords, activeTerm.term_id);

    console.log('✅ Validation completed:', {
      total: validationResult.summary.total,
      valid: validationResult.summary.valid,
      invalid: validationResult.summary.invalid
    });

    return res.json({
      success: true,
      message: 'Bulk import validation completed',
      data: validationResult
    });

  } catch (error) {
    console.error('❌ Bulk validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate bulk import',
      error: error.message
    });
  }
};

/**
 * Validate bulk import data (without file upload)
 * POST /api/sk-officials/bulk/validate-data
 */
const validateBulkData = async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required'
      });
    }

    console.log(`🔍 Validating ${records.length} records`);

    // Get active term
    const activeTerm = await getActiveTerm();
    if (!activeTerm) {
      return res.status(400).json({
        success: false,
        message: 'No active SK term found. Please create an active term first.'
      });
    }

    // Normalize and resolve barangay names to IDs when needed
    const rawValidationRecords = records.map(record => ({
      firstName: record.firstName || record.first_name,
      lastName: record.lastName || record.last_name,
      middleName: record.middleName || record.middle_name,
      personalEmail: record.personalEmail || record.personal_email,
      barangayId: record.barangayId || record.barangay_id,
      barangayName: record.barangayName || record.barangay_name,
      position: record.position
    }));
    const validationRecords = await resolveBarangayIds(rawValidationRecords);

    // Validate records using SKValidationService
    const validationResult = await SKValidationService.getImportPreview(validationRecords, activeTerm.term_id);

    console.log('✅ Data validation completed:', {
      total: validationResult.summary.total,
      valid: validationResult.summary.valid,
      invalid: validationResult.summary.invalid
    });

    return res.json({
      success: true,
      message: 'Bulk data validation completed',
      data: validationResult
    });

  } catch (error) {
    console.error('❌ Bulk data validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate bulk data',
      error: error.message
    });
  }
};

/**
 * Resolve barangayName to barangayId for an array of records
 */
const resolveBarangayIds = async (records) => {
  const client = await getClient();
  try {
    const barangays = await client.query('SELECT barangay_id, barangay_name FROM "Barangay"');
    const nameToId = new Map(
      barangays.rows.map(b => [String(b.barangay_name).trim().toLowerCase(), b.barangay_id])
    );

    return records.map(r => {
      if (!r.barangayId && r.barangayName) {
        const id = nameToId.get(String(r.barangayName).trim().toLowerCase());
        return { ...r, barangayId: id || null };
      }
      return r;
    });
  } finally {
    client.release();
  }
};

export default {
  // Bulk import
  bulkImportSKOfficials,
  getBulkImportTemplate,
  
  // Bulk validation (new)
  validateBulkImport,
  validateBulkData,
  
  // Bulk status operations
  bulkUpdateStatus
};
