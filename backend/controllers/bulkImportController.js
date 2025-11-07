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
import bcrypt from 'bcryptjs';
import notificationService from '../services/notificationService.js';
import { createUserForStaff, createUserForAdmin } from '../utils/usersTableHelper.js';
import { createAuditLog } from '../middleware/auditLogger.js';

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

  console.log('🔍 Executing SQL:', insertSQL);
  console.log('🔍 With params:', insertParams);

  const result = await client.query(insertSQL, insertParams);
  console.log('🔍 SQL result:', result.rows[0]);
  return result.rows[0];
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
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Parse the file based on type
    let parseResult;
    if (fileExt === '.csv') {
      parseResult = await parseCSVFile(filePath);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      parseResult = parseExcelFile(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    const { data: rawData, errors: parseErrors } = parseResult;

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in the file',
        parseErrors
      });
    }

    // Process and insert records with individual transactions per record
    const insertedRecords = [];
    const processingErrors = [];

    for (let i = 0; i < rawData.length; i++) {
      const client = await getClient();
      
      try {
        console.log(`🔍 Processing row ${i + 1}:`, rawData[i]);
        
        const processed = await processStaffRecord(rawData[i], i + 1, req, client);
        
        if (processed.success) {
          console.log('🔍 About to insert record:', {
            lydoId: processed.data.lydoId,
            firstName: processed.data.firstName,
            lastName: processed.data.lastName,
            email: processed.data.email,
            personalEmail: processed.data.personalEmail,
            roleId: processed.data.roleId
          });
          
          // Start individual transaction for this record
          await client.query('BEGIN');
          
          try {
            const inserted = await insertStaffRecord(client, processed.data);
            console.log('✅ Successfully inserted:', inserted);

            // CRITICAL: Create Users table entry for notifications system
            console.log('👤 Creating Users table entry for notifications...');
            console.log('🔍 Debug: processed.data:', {
              lydoId: processed.data.lydoId,
              roleId: processed.data.roleId,
              firstName: processed.data.firstName
            });
            
            const userType = (processed.data.roleId === 'ROL001' || processed.data.firstName === 'Admin') ? 'admin' : 'staff';
            console.log('🔍 Determined user type:', userType);
            
            try {
              if (userType === 'admin') {
                console.log('👑 Creating admin user entry...');
                await createUserForAdmin(processed.data.lydoId, client);
              } else {
                console.log('👤 Creating staff user entry...');
                await createUserForStaff(processed.data.lydoId, client);
              }
              console.log('✅ Users table entry created successfully');
            } catch (userCreationError) {
              console.error('❌ Failed to create Users table entry:', userCreationError);
              console.error('🔍 LYDO ID that failed:', processed.data.lydoId);
              throw userCreationError; // Re-throw to trigger rollback
            }

            // Commit this individual record
            await client.query('COMMIT');
            
            // Create individual audit log for each staff member
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
                  staffName: staffName,
                  resourceType: 'staff',
                  roleId: processed.data.roleId,
                  email: processed.data.personalEmail,
                  importedViaBulk: true
                },
                ipAddress: req.ip || '127.0.0.1',
                userAgent: req.get('User-Agent') || 'Bulk Import',
                status: 'success'
              }).catch(err => console.error('Individual audit log failed:', err));
            }, i * 50);
            
            insertedRecords.push({
              ...inserted,
              tempPassword: processed.tempPassword,
              originalData: processed.originalData
            });
            
          } catch (insertError) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to insert record:', insertError);
            processingErrors.push(`Row ${i + 1}: Insert failed - ${insertError.message}`);
          }
        } else {
          console.error('❌ Processing failed:', processed.error);
          processingErrors.push(processed.error);
        }
      } catch (error) {
        console.error('❌ Unexpected error processing row:', i + 1, error);
        processingErrors.push(`Row ${i + 1}: Unexpected error - ${error.message}`);
      } finally {
        client.release();
      }
    }
    
    // Send welcome emails to all imported staff (fire-and-forget, same as createStaff)
    console.log(`📧 Sending welcome emails to ${insertedRecords.length} successfully imported staff members...`);
    
    for (const record of insertedRecords) {
      console.log(`📧 Sending welcome email to: ${record.first_name} ${record.last_name} (${record.lydo_id}) at ${record.personal_email}`);
      console.log(`🔍 Email data:`, {
        lydoId: record.lydo_id,
        firstName: record.first_name,
        lastName: record.last_name,
        personalEmail: record.personal_email,
        orgEmail: record.email,
        hasPassword: !!record.tempPassword,
        passwordLength: record.tempPassword ? record.tempPassword.length : 0
      });
      
      notificationService.sendWelcomeNotification({
        lydoId: record.lydo_id,
        firstName: record.first_name,
        lastName: record.last_name,
        personalEmail: record.personal_email,
        orgEmail: record.email,
        password: record.tempPassword,
        createdBy: req.user?.id || 'BULK_IMPORT'
      }).catch(err => console.error(`❌ Welcome notification failed for ${record.first_name} ${record.last_name}:`, err));
    }
    
    if (insertedRecords.length === 0) {
      console.log('⚠️ No staff members were successfully imported, so no welcome emails will be sent.');
    }
      
    // Send admin notification about bulk import
    const results = {
      summary: {
        totalRows: rawData.length,
        validRecords: insertedRecords.length,
        importedRecords: insertedRecords.length,
        errors: parseErrors.length + processingErrors.length
      },
      imported: insertedRecords.map(r => ({
        lydoId: r.lydo_id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.personal_email
      })),
      errors: [...parseErrors, ...processingErrors]
    };

    // Send admin notifications about staff bulk import (with req.user context fix)
    const currentUser = req.user;
    setTimeout(async () => {
      try {
        await notificationService.notifyAdminsAboutStaffBulkImport(results, currentUser);
      } catch (notifError) {
        console.error('Staff bulk import notification error:', notifError);
      }
    }, 100);

    // Create audit log for bulk import
    // Create meaningful resource name for bulk import
    const importedCount = results.summary.importedRecords;
    const errorCount = results.summary.errors;
    const fileName = req.file.originalname;
    
    let resourceName;
    if (errorCount > 0) {
      resourceName = `Staff Import - ${fileName} (${importedCount} ${importedCount === 1 ? 'member' : 'members'}, ${errorCount} ${errorCount === 1 ? 'error' : 'errors'})`;
    } else {
      resourceName = `Staff Import - ${fileName} (${importedCount} ${importedCount === 1 ? 'member' : 'members'})`;
    }
    
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Bulk Import',
      resource: '/api/staff/bulk/import',
      resourceId: null,
      resourceName: resourceName,
      details: {
        resourceType: 'staff',
        totalItems: results.summary.totalRows,
        successCount: results.summary.importedRecords,
        errorCount: results.summary.errors,
        fileName: req.file.originalname,
        action: 'import'
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Bulk Import',
      status: 'success'
    }).catch(err => console.error('Audit log failed:', err));
    
    // Log successful insertions for debugging
    console.log(`✅ Successfully committed ${insertedRecords.length} records to database`);
    console.log(`📧 Sending welcome emails to ${insertedRecords.length} staff members...`);
    if (insertedRecords.length > 0) {
      console.log('📝 Inserted records:', insertedRecords.map(r => ({ 
        lydoId: r.lydo_id, 
        name: `${r.first_name} ${r.last_name}`,
        email: r.email
      })));
    }

    // Prepare response
    const response = {
      success: true,
      message: `Bulk import completed. ${insertedRecords.length} staff members imported successfully.`,
      summary: {
        totalRows: rawData.length,
        validRecords: insertedRecords.length,
        importedRecords: insertedRecords.length,
        errors: parseErrors.length + processingErrors.length,
        emailsSent: insertedRecords.length // Track how many welcome emails should be sent
      },
      imported: insertedRecords.map(record => ({
        lydoId: record.lydo_id,
        name: `${record.first_name} ${record.last_name}`,
        email: record.email,
        personalEmail: record.personal_email,
        tempPassword: record.tempPassword,
        welcomeEmailSent: true // Indicate that welcome email should be sent
      })),
      errors: [...parseErrors, ...processingErrors]
    };

    return res.json(response);

  } catch (error) {
    console.error('Bulk import error:', error);
    
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
    }).catch(err => console.error('Failed import audit log error:', err));
    
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
        console.error('Failed to clean up file:', cleanupError);
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
    console.error('Template generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};
