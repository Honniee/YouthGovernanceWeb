import { query } from '../config/database.js';
import { generateUserId } from './idGenerator.js';

/**
 * Utility functions for managing Users table integration
 * Ensures all staff/SK officials are properly linked for notifications
 */

/**
 * Creates a user entry in the Users table for staff members
 * @param {string} lydoId - The LYDO ID of the staff member
 * @param {Object} client - Database client (for transactions)
 * @returns {Promise<string>} The generated user_id
 */
export const createUserForStaff = async (lydoId, client = null) => {
  try {
    const dbClient = client || { query };
    
    // Check if user already exists
    const existingUser = await dbClient.query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`👤 User already exists for LYDO ID ${lydoId}: ${existingUser.rows[0].user_id}`);
      return existingUser.rows[0].user_id;
    }
    
    // Generate new user ID
    const userId = await generateUserId();
    
    // Insert user record
    const insertQuery = `
      INSERT INTO "Users" (
        user_id, 
        user_type, 
        lydo_id, 
        sk_id, 
        youth_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING user_id
    `;
    
    const result = await dbClient.query(insertQuery, [
      userId,
      'lydo_staff', // user_type for staff
      lydoId,       // lydo_id
      null,         // sk_id (null for staff)
      null          // youth_id (null for staff)
    ]);
    
    console.log(`✅ Created Users table entry: ${userId} for LYDO ID ${lydoId}`);
    return result.rows[0].user_id;
    
  } catch (error) {
    console.error('❌ Error creating user for staff:', error);
    throw new Error(`Failed to create user entry for LYDO ID: ${lydoId}`);
  }
};

/**
 * Creates a user entry in the Users table for SK officials
 * @param {string} skId - The SK ID of the official
 * @param {Object} client - Database client (for transactions)
 * @returns {Promise<string>} The generated user_id
 */
export const createUserForSK = async (skId, client = null) => {
  try {
    const dbClient = client || { query };
    
    // Check if user already exists
    const existingUser = await dbClient.query(
      'SELECT user_id FROM "Users" WHERE sk_id = $1',
      [skId]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`👤 User already exists for SK ID ${skId}: ${existingUser.rows[0].user_id}`);
      return existingUser.rows[0].user_id;
    }
    
    // Generate new user ID
    const userId = await generateUserId();
    
    // Insert user record
    const insertQuery = `
      INSERT INTO "Users" (
        user_id, 
        user_type, 
        lydo_id, 
        sk_id, 
        youth_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING user_id
    `;
    
    const result = await dbClient.query(insertQuery, [
      userId,
      'sk_official', // user_type for SK officials
      null,          // lydo_id (null for SK officials)
      skId,          // sk_id
      null           // youth_id (null for SK officials)
    ]);
    
    console.log(`✅ Created Users table entry: ${userId} for SK ID ${skId}`);
    return result.rows[0].user_id;
    
  } catch (error) {
    console.error('❌ Error creating user for SK official:', error);
    throw new Error(`Failed to create user entry for SK ID: ${skId}`);
  }
};

/**
 * Creates a user entry in the Users table for admin
 * @param {string} lydoId - The LYDO ID of the admin
 * @param {Object} client - Database client (for transactions)
 * @returns {Promise<string>} The generated user_id
 */
export const createUserForAdmin = async (lydoId, client = null) => {
  try {
    const dbClient = client || { query };
    
    // Check if user already exists
    const existingUser = await dbClient.query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`👤 User already exists for Admin LYDO ID ${lydoId}: ${existingUser.rows[0].user_id}`);
      return existingUser.rows[0].user_id;
    }
    
    // Generate new user ID
    const userId = await generateUserId();
    
    // Insert user record
    const insertQuery = `
      INSERT INTO "Users" (
        user_id, 
        user_type, 
        lydo_id, 
        sk_id, 
        youth_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING user_id
    `;
    
    const result = await dbClient.query(insertQuery, [
      userId,
      'admin',     // user_type for admin
      lydoId,      // lydo_id
      null,        // sk_id (null for admin)
      null         // youth_id (null for admin)
    ]);
    
    console.log(`✅ Created Users table entry: ${userId} for Admin LYDO ID ${lydoId}`);
    return result.rows[0].user_id;
    
  } catch (error) {
    console.error('❌ Error creating user for admin:', error);
    throw new Error(`Failed to create user entry for Admin LYDO ID: ${lydoId}`);
  }
};

/**
 * Bulk create user entries for existing staff/SK officials (migration utility)
 * @returns {Promise<Object>} Summary of created users
 */
export const migrateExistingUsersToUsersTable = async () => {
  try {
    console.log('🔄 Starting Users table migration...');
    
    const summary = {
      staffProcessed: 0,
      skProcessed: 0,
      adminProcessed: 0,
      errors: []
    };
    
    // 1. Process existing LYDO staff
    console.log('👥 Processing existing LYDO staff...');
    const staffResult = await query(`
      SELECT l.lydo_id, r.role_name 
      FROM "LYDO" l 
      JOIN "Roles" r ON l.role_id = r.role_id 
      WHERE l.is_active = true
    `);
    
    for (const staff of staffResult.rows) {
      try {
        if (staff.role_name === 'admin') {
          await createUserForAdmin(staff.lydo_id);
          summary.adminProcessed++;
        } else {
          await createUserForStaff(staff.lydo_id);
          summary.staffProcessed++;
        }
      } catch (error) {
        console.error(`❌ Failed to create user for ${staff.lydo_id}:`, error.message);
        summary.errors.push(`LYDO ${staff.lydo_id}: ${error.message}`);
      }
    }
    
    // 2. Process existing SK Officials (if any exist)
    console.log('🏛️ Processing existing SK Officials...');
    const skResult = await query('SELECT sk_id FROM "SK_Officials" WHERE is_active = true');
    
    for (const sk of skResult.rows) {
      try {
        await createUserForSK(sk.sk_id);
        summary.skProcessed++;
      } catch (error) {
        console.error(`❌ Failed to create user for ${sk.sk_id}:`, error.message);
        summary.errors.push(`SK ${sk.sk_id}: ${error.message}`);
      }
    }
    
    console.log('✅ Users table migration completed!');
    console.log(`📊 Summary:
      - Staff processed: ${summary.staffProcessed}
      - SK officials processed: ${summary.skProcessed}  
      - Admins processed: ${summary.adminProcessed}
      - Errors: ${summary.errors.length}
    `);
    
    if (summary.errors.length > 0) {
      console.log('❌ Migration errors:');
      summary.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Users table migration failed:', error);
    throw error;
  }
};

/**
 * Validates Users table integrity
 * @returns {Promise<Object>} Validation report
 */
export const validateUsersTableIntegrity = async () => {
  try {
    console.log('🔍 Validating Users table integrity...');
    
    const report = {
      totalUsers: 0,
      staffWithoutUsers: [],
      skWithoutUsers: [],
      orphanedUsers: [],
      duplicateUsers: [],
      isValid: true
    };
    
    // Count total users
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM "Users"');
    report.totalUsers = parseInt(totalUsersResult.rows[0].count);
    
    // Find staff without Users entries
    const staffWithoutUsersResult = await query(`
      SELECT l.lydo_id, l.first_name, l.last_name 
      FROM "LYDO" l 
      LEFT JOIN "Users" u ON l.lydo_id = u.lydo_id 
      WHERE l.is_active = true AND u.user_id IS NULL
    `);
    report.staffWithoutUsers = staffWithoutUsersResult.rows;
    
    // Find SK officials without Users entries
    const skWithoutUsersResult = await query(`
      SELECT s.sk_id, s.first_name, s.last_name 
      FROM "SK_Officials" s 
      LEFT JOIN "Users" u ON s.sk_id = u.sk_id 
      WHERE s.is_active = true AND u.user_id IS NULL
    `);
    report.skWithoutUsers = skWithoutUsersResult.rows;
    
    // Find orphaned Users (pointing to non-existent staff/SK)
    const orphanedUsersResult = await query(`
      SELECT u.user_id, u.user_type, u.lydo_id, u.sk_id 
      FROM "Users" u 
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id 
      LEFT JOIN "SK_Officials" s ON u.sk_id = s.sk_id 
      WHERE (u.lydo_id IS NOT NULL AND l.lydo_id IS NULL) 
         OR (u.sk_id IS NOT NULL AND s.sk_id IS NULL)
    `);
    report.orphanedUsers = orphanedUsersResult.rows;
    
    // Find duplicate Users
    const duplicateUsersResult = await query(`
      SELECT lydo_id, sk_id, COUNT(*) as count 
      FROM "Users" 
      WHERE lydo_id IS NOT NULL OR sk_id IS NOT NULL
      GROUP BY lydo_id, sk_id 
      HAVING COUNT(*) > 1
    `);
    report.duplicateUsers = duplicateUsersResult.rows;
    
    // Determine if valid
    report.isValid = (
      report.staffWithoutUsers.length === 0 &&
      report.skWithoutUsers.length === 0 &&
      report.orphanedUsers.length === 0 &&
      report.duplicateUsers.length === 0
    );
    
    console.log('📊 Users table validation report:');
    console.log(`  - Total users: ${report.totalUsers}`);
    console.log(`  - Staff without Users entries: ${report.staffWithoutUsers.length}`);
    console.log(`  - SK officials without Users entries: ${report.skWithoutUsers.length}`);
    console.log(`  - Orphaned Users: ${report.orphanedUsers.length}`);
    console.log(`  - Duplicate Users: ${report.duplicateUsers.length}`);
    console.log(`  - Overall status: ${report.isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Users table validation failed:', error);
    throw error;
  }
};

export default {
  createUserForStaff,
  createUserForSK,
  createUserForAdmin,
  migrateExistingUsersToUsersTable,
  validateUsersTableIntegrity
};
