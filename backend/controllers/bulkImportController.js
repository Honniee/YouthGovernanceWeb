import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { query, getClient } from '../config/database.js';
import { generateLYDOId } from '../utils/idGenerator.js';
import { generateSecurePassword } from '../utils/passwordGenerator.js';
import { generateOrgEmail } from '../utils/emailGenerator.js';
import { validateStaffCreation, sanitizeInput } from '../utils/validation.js';
import { validateStaffBulkImport } from '../utils/staffBulkValidation.js';
import bcrypt from 'bcryptjs';
import notificationService from '../services/notificationService.js';
import { createUserForStaff, createUserForAdmin } from '../utils/usersTableHelper.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/staff';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `staff-import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Parse CSV file
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Clean and normalize the data
          const cleanData = {};
          Object.keys(data).forEach(key => {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            cleanData[cleanKey] = data[key]?.trim() || '';
          });
          results.push(cleanData);
        } catch (error) {
          errors.push(`Row ${results.length + 1}: ${error.message}`);
        }
      })
      .on('end', () => {
        resolve({ data: results, errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Parse Excel file
const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Normalize column names
    const normalizedData = data.map(row => {
      const cleanData = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        cleanData[cleanKey] = row[key]?.toString().trim() || '';
      });
      return cleanData;
    });
    
    return { data: normalizedData, errors: [] };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

// Map CSV/Excel columns to staff fields
const mapStaffData = (rowData) => {
  // Common column name mappings
  const fieldMappings = {
    // First Name
    first_name: ['first_name', 'firstname', 'first', 'given_name', 'fname'],
    // Last Name  
    last_name: ['last_name', 'lastname', 'last', 'surname', 'family_name', 'lname'],
    // Middle Name
    middle_name: ['middle_name', 'middlename', 'middle', 'mname'],
    // Suffix
    suffix: ['suffix', 'jr', 'sr', 'iii', 'iv'],
    // Personal Email
    personal_email: ['personal_email', 'email', 'personal_mail', 'private_email']
  };

  const mappedData = {};

  // Map each field
  Object.keys(fieldMappings).forEach(field => {
    const possibleColumns = fieldMappings[field];
    for (const column of possibleColumns) {
      if (rowData[column] && rowData[column].trim()) {
        mappedData[field] = rowData[column].trim();
        break;
      }
    }
  });

  return mappedData;
};

// Validate and process a single staff record (matches createStaff exactly)
const processStaffRecord = async (rowData, rowIndex, req, client) => {
  try {
    const mappedData = mapStaffData(rowData);
    
    // Required fields check
    if (!mappedData.first_name || !mappedData.last_name || !mappedData.personal_email) {
      return {
        success: false,
        error: `Row ${rowIndex}: Missing required fields (first_name, last_name, personal_email)`,
        data: mappedData
      };
    }

    // Pre-check: ensure personal email is unique (same as createStaff)
    const personalExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE personal_email = $1', [mappedData.personal_email]);
    if (parseInt(personalExists.rows[0].count) > 0) {
      return {
        success: false,
        error: `Row ${rowIndex}: Personal email already exists: ${mappedData.personal_email}`,
        data: mappedData
      };
    }

    // Generate identifiers and credentials with retry logic for race conditions
    let lydoId;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      lydoId = await generateLYDOId();
      
      // Check if LYDO ID already exists
      const idExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE lydo_id = $1', [lydoId]);
      if (parseInt(idExists.rows[0].count) === 0) {
        break; // ID is unique, proceed
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        return {
          success: false,
          error: `Row ${rowIndex}: Failed to generate unique LYDO ID after ${maxAttempts} attempts. Last attempted: ${lydoId}`,
          data: mappedData
        };
      }
      
      // Wait a bit before retrying to reduce race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const orgEmail = await generateOrgEmail(mappedData.first_name, mappedData.last_name);

    // Double-check: org email uniqueness (same as createStaff)
    const orgExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE email = $1', [orgEmail]);
    if (parseInt(orgExists.rows[0].count) > 0) {
      return {
        success: false,
        error: `Row ${rowIndex}: Generated org email already exists: ${orgEmail}`,
        data: mappedData
      };
    }

    const password = generateSecurePassword(12);
    const passwordHash = await bcrypt.hash(password, 10);

    const staffData = {
      lydoId,
      roleId: 'ROL002', // Default to lydo_staff (same as manual form)
      email: orgEmail,
      personalEmail: mappedData.personal_email,
      firstName: mappedData.first_name,
      lastName: mappedData.last_name,
      middleName: mappedData.middle_name || null,
      suffix: mappedData.suffix || null,
      passwordHash: passwordHash,
      isActive: true,
      emailVerified: false,
      createdBy: req.user?.id || null
    };

    return {
      success: true,
      data: staffData,
      tempPassword: password,
      originalData: mappedData
    };

  } catch (error) {
    return {
      success: false,
      error: `Row ${rowIndex}: Processing error - ${error.message}`,
      data: rowData
    };
  }
};

// Insert staff record into database (exactly same as createStaff)
const insertStaffRecord = async (client, staffData) => {
  const insertSQL = `
    INSERT INTO "LYDO" (
      lydo_id, role_id, email, personal_email, password_hash,
      first_name, last_name, middle_name, suffix,
      is_active, email_verified, created_by, created_at, updated_at, deactivated
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      true, false, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false
    ) RETURNING *
  `;
  
  const insertParams = [
    staffData.lydoId, 
    staffData.roleId, 
    staffData.email, 
    staffData.personalEmail, 
    staffData.passwordHash,
    staffData.firstName, 
    staffData.lastName, 
    staffData.middleName, 
    staffData.suffix,
    staffData.createdBy
  ];

  logger.debug('Executing SQL for staff insert', { sql: insertSQL, params: insertParams });

  const result = await client.query(insertSQL, insertParams);
  logger.debug('SQL result for staff insert', { result: result.rows[0] });
  return result.rows[0];
};

const parseStaffFile = async (filePath) => {
  const fileExt = path.extname(filePath).toLowerCase();
  if (fileExt === '.csv') {
    return await parseCSVFile(filePath);
  }
  if (fileExt === '.xlsx' || fileExt === '.xls') {
    return parseExcelFile(filePath);
  }
  throw new Error('Unsupported file format');
};

export const validateStaffBulkImportFile = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    filePath = req.file.path;
    const { data: rawData, errors: parseErrors } = await parseStaffFile(filePath);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in the file',
        errors: parseErrors || []
      });
    }

    const validationResult = await validateStaffBulkImport(rawData);

    return res.json({
      success: true,
      data: {
        ...validationResult,
        parseErrors
      }
    });
  } catch (error) {
    logger.error('Staff bulk validation error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to validate bulk import file',
      error: error.message
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error('Failed to clean up validation file', { error: cleanupError.message, stack: cleanupError.stack });
      }
    }
  }
};

// Main bulk import function
export const bulkImportStaff = async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    filePath = req.file.path;

    const allowedStrategies = ['skip', 'update', 'restore'];
    const duplicateStrategyRaw = (req.body?.duplicateStrategy || 'skip').toString().toLowerCase();
    const duplicateStrategy = allowedStrategies.includes(duplicateStrategyRaw)
      ? duplicateStrategyRaw
      : 'skip';

    const { data: rawData, errors: parseErrors = [] } = await parseStaffFile(filePath);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in the file',
        errors: parseErrors
      });
    }

    const validationResult = await validateStaffBulkImport(rawData);
    const validatedRows = validationResult.rows || [];

    const results = {
      total: validatedRows.length,
      created: 0,
      updated: 0,
      restored: 0,
      skipped: 0,
      failed: 0,
      rows: [],
      errors: [...parseErrors]
    };

    const insertedRecords = [];

    const isActiveMatch = (match) => match && match.is_active === true && match.deactivated !== true;
    const isArchivedMatch = (match) => match && !isActiveMatch(match);

    for (const rowInfo of validatedRows) {
      const rowOutcome = {
        rowNumber: rowInfo.rowNumber,
        data: rowInfo.normalized,
        validationStatus: rowInfo.status,
        validationIssues: rowInfo.issues,
        duplicate: rowInfo.duplicate,
        action: null,
        message: ''
      };

      if (rowInfo.status === 'error') {
        results.failed++;
        rowOutcome.action = 'invalid';
        rowOutcome.message = 'Skipped due to validation errors';
        rowInfo.issues.forEach((issue) => {
          results.errors.push(`Row ${rowInfo.rowNumber}: ${issue}`);
        });
        results.rows.push(rowOutcome);
        continue;
      }

      if (rowInfo.duplicate?.inFile && !rowInfo.duplicate?.isPrimaryInFile) {
        results.skipped++;
        rowOutcome.action = 'skipped';
        rowOutcome.message = 'Skipped duplicate row within the uploaded file';
        results.rows.push(rowOutcome);
        continue;
      }

      const existingMatches = rowInfo.existingMatches || [];
      const activeMatch = existingMatches.find(isActiveMatch);
      const archivedMatch = existingMatches.find(isArchivedMatch);

      if (existingMatches.length > 0) {
        if (duplicateStrategy === 'skip') {
          results.skipped++;
          rowOutcome.action = 'skipped';
          rowOutcome.message = 'Skipped duplicate in system (strategy: skip)';
          results.rows.push(rowOutcome);
          continue;
        }

        if (duplicateStrategy === 'update') {
          const target = activeMatch || archivedMatch;
          if (!target) {
            results.skipped++;
            rowOutcome.action = 'skipped';
            rowOutcome.message = 'Duplicate found but no matching record to update';
            results.rows.push(rowOutcome);
            continue;
          }

          const client = await getClient();
          try {
            await client.query('BEGIN');
            await client.query(
              `
                UPDATE "LYDO"
                SET first_name = $1,
                    last_name = $2,
                    middle_name = $3,
                    suffix = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE lydo_id = $5
              `,
              [
                rowInfo.normalized.first_name || null,
                rowInfo.normalized.last_name || null,
                rowInfo.normalized.middle_name || null,
                rowInfo.normalized.suffix || null,
                target.lydo_id
              ]
            );
            await client.query('COMMIT');

            results.updated++;
            rowOutcome.action = 'updated';
            rowOutcome.message = `Existing staff (${target.lydo_id}) updated`;

            setTimeout(() => {
              createAuditLog({
                userId: req.user?.id || 'SYSTEM',
                userType: req.user?.userType || 'admin',
                action: 'Update',
                resource: '/api/staff',
                resourceId: target.lydo_id,
                resourceName: `${rowInfo.normalized.first_name} ${rowInfo.normalized.last_name}`,
                details: {
                  resourceType: 'staff',
                  importedViaBulk: true,
                  duplicateStrategy: duplicateStrategy,
                  action: 'update'
                },
                ipAddress: req.ip || '127.0.0.1',
                userAgent: req.get('User-Agent') || 'Bulk Import',
                status: 'success'
              }).catch((err) => logger.error('Staff update audit log failed', { error: err.message, stack: err.stack, lydoId: target.lydo_id }));
            }, 0);
          } catch (error) {
            await client.query('ROLLBACK');
            results.failed++;
            rowOutcome.action = 'failed';
            rowOutcome.message = `Failed to update existing staff: ${error.message}`;
            results.errors.push(`Row ${rowInfo.rowNumber}: ${error.message}`);
          } finally {
            client.release();
          }

          results.rows.push(rowOutcome);
          continue;
        }

        if (duplicateStrategy === 'restore') {
          const target = archivedMatch || activeMatch;
          if (!target) {
            results.skipped++;
            rowOutcome.action = 'skipped';
            rowOutcome.message = 'Duplicate found but no matching record to restore';
            results.rows.push(rowOutcome);
            continue;
          }

          const client = await getClient();
          try {
            await client.query('BEGIN');
            await client.query(
              `
                UPDATE "LYDO"
                SET first_name = $1,
                    last_name = $2,
                    middle_name = $3,
                    suffix = $4,
                    is_active = true,
                    deactivated = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE lydo_id = $5
              `,
              [
                rowInfo.normalized.first_name || null,
                rowInfo.normalized.last_name || null,
                rowInfo.normalized.middle_name || null,
                rowInfo.normalized.suffix || null,
                target.lydo_id
              ]
            );
            await client.query('COMMIT');
            
            results.restored++;
            rowOutcome.action = 'restored';
            rowOutcome.message = `Existing staff (${target.lydo_id}) restored`;

            setTimeout(() => {
              createAuditLog({
                userId: req.user?.id || 'SYSTEM',
                userType: req.user?.userType || 'admin',
                action: 'Restore',
                resource: '/api/staff',
                resourceId: target.lydo_id,
                resourceName: `${rowInfo.normalized.first_name} ${rowInfo.normalized.last_name}`,
                details: {
                  resourceType: 'staff',
                  importedViaBulk: true,
                  duplicateStrategy: duplicateStrategy,
                  action: 'restore'
                },
                ipAddress: req.ip || '127.0.0.1',
                userAgent: req.get('User-Agent') || 'Bulk Import',
                status: 'success'
              }).catch((err) => logger.error('Staff restore audit log failed', { error: err.message, stack: err.stack, lydoId: target.lydo_id }));
            }, 0);
          } catch (error) {
            await client.query('ROLLBACK');
            results.failed++;
            rowOutcome.action = 'failed';
            rowOutcome.message = `Failed to restore existing staff: ${error.message}`;
            results.errors.push(`Row ${rowInfo.rowNumber}: ${error.message}`);
          } finally {
            client.release();
          }

          results.rows.push(rowOutcome);
          continue;
        }
      }

      const client = await getClient();
      try {
        const processed = await processStaffRecord(
          {
            first_name: rowInfo.normalized.first_name,
            last_name: rowInfo.normalized.last_name,
            middle_name: rowInfo.normalized.middle_name,
            suffix: rowInfo.normalized.suffix,
            personal_email: rowInfo.normalized.personal_email
          },
          rowInfo.rowNumber,
          req,
          client
        );

        if (!processed.success) {
          results.failed++;
          rowOutcome.action = 'failed';
          rowOutcome.message = processed.error;
          results.errors.push(processed.error);
          rowOutcome.validationIssues = [...rowOutcome.validationIssues, processed.error];
          results.rows.push(rowOutcome);
          continue;
        }

        await client.query('BEGIN');
        try {
          const inserted = await insertStaffRecord(client, processed.data);
          const userType =
            processed.data.roleId === 'ROL001' || processed.data.firstName === 'Admin'
              ? 'admin'
              : 'staff';

          if (userType === 'admin') {
            await createUserForAdmin(processed.data.lydoId, client);
          } else {
            await createUserForStaff(processed.data.lydoId, client);
          }

          await client.query('COMMIT');
            
            insertedRecords.push({
              ...inserted,
              tempPassword: processed.tempPassword,
              originalData: processed.originalData
            });
            
          results.created++;
          rowOutcome.action = 'created';
          rowOutcome.message = `New staff created (${processed.data.lydoId})`;

          const staffName = `${processed.data.firstName} ${processed.data.lastName}`;
          setTimeout(() => {
            createAuditLog({
              userId: req.user?.id || 'SYSTEM',
              userType: req.user?.userType || 'admin',
              action: 'Create',
              resource: '/api/staff',
              resourceId: processed.data.lydoId,
              resourceName: staffName,
              details: {
                staffName,
                resourceType: 'staff',
                roleId: processed.data.roleId,
                email: processed.data.personalEmail,
                importedViaBulk: true,
                duplicateStrategy
              },
              ipAddress: req.ip || '127.0.0.1',
              userAgent: req.get('User-Agent') || 'Bulk Import',
              status: 'success'
            }).catch((err) => logger.error('Individual audit log failed for staff creation', { error: err.message, stack: err.stack, lydoId: processed.data.lydoId }));
          }, 0);
          } catch (insertError) {
            await client.query('ROLLBACK');
          results.failed++;
          rowOutcome.action = 'failed';
          rowOutcome.message = `Insert failed: ${insertError.message}`;
          results.errors.push(`Row ${rowInfo.rowNumber}: ${insertError.message}`);
        }
      } catch (error) {
        results.failed++;
        rowOutcome.action = 'failed';
        rowOutcome.message = `Unexpected error: ${error.message}`;
        results.errors.push(`Row ${rowInfo.rowNumber}: ${error.message}`);
      } finally {
        client.release();
      }

      results.rows.push(rowOutcome);
    }
    
    // Send welcome notifications for newly created staff
    if (insertedRecords.length > 0) {
    for (const record of insertedRecords) {
        notificationService
          .sendWelcomeNotification({
        lydoId: record.lydo_id,
        firstName: record.first_name,
        lastName: record.last_name,
        personalEmail: record.personal_email,
        orgEmail: record.email,
        password: record.tempPassword,
        createdBy: req.user?.id || 'BULK_IMPORT'
          })
          .catch((err) =>
            logger.error(`Welcome notification failed for staff`, { error: err.message, stack: err.stack, name: `${record.first_name} ${record.last_name}`, lydoId: record.lydo_id })
          );
      }
    }

    const summary = {
      total: results.total,
      created: results.created,
      updated: results.updated,
      restored: results.restored,
      skipped: results.skipped,
      failed: results.failed,
      duplicateStrategy
    };

    const notificationSummary = {
      totalRows: results.total,
      validRecords: results.total - results.failed,
      importedRecords: results.created + results.restored,
      errors: results.failed + (parseErrors?.length || 0),
      fileName: req.file.originalname,
      createdRecords: results.created,
      updatedRecords: results.updated,
      restoredRecords: results.restored,
      skippedRecords: results.skipped,
      duplicateStrategy
    };

    const currentUser = req.user;
    setTimeout(async () => {
      try {
        await notificationService.notifyAdminsAboutStaffBulkImport(notificationSummary, currentUser);
      } catch (notifError) {
        logger.error('Staff bulk import notification error', { error: notifError.message, stack: notifError.stack });
      }
    }, 100);

    const successCount = results.created + results.updated + results.restored;
    const errorCount = results.failed + (parseErrors?.length || 0);
    const resourceName = `Staff Import - ${req.file.originalname} (${successCount} processed, ${errorCount} errors)`;
    
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Bulk Import',
      resource: '/api/staff/bulk/import',
      resourceId: null,
      resourceName,
      details: {
        resourceType: 'staff',
        totalItems: results.total,
        created: results.created,
        updated: results.updated,
        restored: results.restored,
        skipped: results.skipped,
        failed: results.failed,
        duplicateStrategy,
        fileName: req.file.originalname
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Bulk Import',
      status: errorCount > 0 ? 'partial' : 'success'
    }).catch((err) => logger.error('Audit log failed for staff bulk import', { error: err.message, stack: err.stack }));

    const summaryParts = [];
    if (results.created) summaryParts.push(`${results.created} created`);
    if (results.updated) summaryParts.push(`${results.updated} updated`);
    if (results.restored) summaryParts.push(`${results.restored} restored`);
    if (results.skipped) summaryParts.push(`${results.skipped} skipped`);
    if (results.failed) summaryParts.push(`${results.failed} failed`);

    const summaryText = summaryParts.length ? summaryParts.join(', ') : 'No changes applied';

    return res.json({
      success: true,
      message: `Bulk import completed. ${summaryText}.`,
      data: results,
      summary
    });

  } catch (error) {
    logger.error('Bulk import error', { error: error.message, stack: error.stack });
    
    // Create audit log for failed bulk import
    const resourceName = `Staff Import - Failed`;
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Bulk Import',
      resource: '/api/staff/bulk/import',
      resourceId: null,
      resourceName: resourceName,
      details: {
        resourceType: 'staff',
        error: error.message,
        fileName: req.file?.originalname || 'unknown',
        importFailed: true
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Bulk Import',
      status: 'error',
      errorMessage: error.message
    }).catch(err => logger.error('Failed import audit log error', { error: err.message, stack: err.stack }));
    
    return res.status(500).json({
      success: false,
      message: 'Bulk import failed',
      error: error.message
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error('Failed to clean up file', { error: cleanupError.message, stack: cleanupError.stack });
      }
    }
  }
};

// Get bulk import template
export const getBulkImportTemplate = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    
    const templateData = [
      {
        first_name: 'John',
        last_name: 'Doe', 
        middle_name: 'Michael',
        suffix: 'Jr.',
        personal_email: 'john.doe@personal.com'
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        middle_name: '',
        suffix: '',
        personal_email: 'jane.smith@personal.com'
      }
    ];

    if (format === 'csv') {
      const csvHeader = Object.keys(templateData[0]).join(',');
      const csvRows = templateData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="staff_import_template.csv"');
      return res.send(csvContent);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Template');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="staff_import_template.xlsx"');
      return res.send(buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or xlsx.'
      });
    }
  } catch (error) {
    logger.error('Template generation error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};
