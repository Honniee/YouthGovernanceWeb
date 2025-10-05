import db, { getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import { validateYouthProfile } from '../utils/validation.js';

/**
 * Check if a youth profile exists using multiple detection methods:
 * 1. Complete name + gender + birth date (most reliable)
 * 2. Email address (unique identifier)
 * 3. Legacy: name + barangay combination
 */
const checkYouthProfile = async (req, res) => {
  try {
    const { 
      email, 
      contact_number, 
      first_name, 
      last_name, 
      middle_name, 
      suffix, 
      gender, 
      birth_date, 
      barangay_id 
    } = req.body;

    console.log('🔍 Checking youth profile with data:', { 
      email, 
      contact_number, 
      first_name, 
      last_name, 
      middle_name, 
      suffix, 
      gender, 
      birth_date, 
      barangay_id 
    });

    // Determine detection method based on available data
    const hasCompleteName = first_name && last_name && gender && birth_date;
    const hasEmail = email;
    const hasLegacyName = first_name && last_name && barangay_id;
    const hasPhone = contact_number;

    if (!hasCompleteName && !hasEmail && !hasLegacyName && !hasPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide enough data for detection (complete name+gender+birth, email, or name+barangay)'
      });
    }

    let query;
    let params = [];

    // Method 1: Complete name + gender + birth date detection (most reliable)
    if (hasCompleteName) {
      console.log('🔍 Using complete name detection method');
      query = `
        SELECT yp.youth_id, u.user_id, yp.first_name, yp.last_name, yp.middle_name, yp.suffix, yp.gender, yp.birth_date, yp.email
        FROM "Youth_Profiling" yp
        LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
        WHERE yp.first_name = $1 
          AND yp.last_name = $2 
          AND yp.gender = $3 
          AND yp.birth_date = $4
          AND (yp.middle_name = $5 OR (yp.middle_name IS NULL AND $5 IS NULL))
          AND (yp.suffix = $6 OR (yp.suffix IS NULL AND $6 IS NULL))
      `;
      params = [first_name, last_name, gender, birth_date, middle_name || null, suffix || null];
    }
    // Method 2: Email detection (unique identifier)
    else if (hasEmail) {
      console.log('🔍 Using email detection method');
      query = `
        SELECT yp.youth_id, u.user_id, yp.first_name, yp.last_name, yp.middle_name, yp.suffix, yp.gender, yp.birth_date, yp.email
        FROM "Youth_Profiling" yp
        LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
        WHERE yp.email = $1
      `;
      params = [email];
    }
    // Method 3: Legacy name + barangay detection
    else if (hasLegacyName) {
      console.log('🔍 Using legacy name + barangay detection method');
      query = `
        SELECT yp.youth_id, u.user_id, yp.first_name, yp.last_name, yp.middle_name, yp.suffix, yp.gender, yp.birth_date, yp.email
        FROM "Youth_Profiling" yp
        LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
        WHERE yp.first_name = $1 AND yp.last_name = $2 AND yp.barangay_id = $3
      `;
      params = [first_name, last_name, barangay_id];
    }
    // Method 4: Phone number detection (fallback)
    else if (hasPhone) {
      console.log('🔍 Using phone detection method');
      query = `
        SELECT yp.youth_id, u.user_id, yp.first_name, yp.last_name, yp.middle_name, yp.suffix, yp.gender, yp.birth_date, yp.email
        FROM "Youth_Profiling" yp
        LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
        WHERE yp.contact_number = $1
      `;
      params = [contact_number];
    }

    console.log('🔍 Executing query:', query);
    console.log('🔍 With params:', params);

    const result = await db.query(query, params);

    console.log('🔍 Query result:', result.rows);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: 'No existing youth profile found'
      });
    }

    const profile = result.rows[0];

    return res.status(200).json({
      success: true,
      exists: true,
      youth_id: profile.youth_id,
      user_id: null, // Will be handled later
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        middle_name: profile.middle_name,
        suffix: profile.suffix,
        age: profile.age,
        gender: profile.gender,
        contact_number: profile.contact_number,
        email: profile.email,
        barangay_id: profile.barangay_id,
        purok_zone: profile.purok_zone,
        user_type: 'youth',
        is_active: true,
        created_at: profile.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error checking youth profile:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking youth profile',
      error: error.message
    });
  }
};

/**
 * Create a new youth profile and associated user record
 */
const createYouthProfile = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const {
      first_name,
      last_name,
      middle_name,
      suffix,
      age,
      gender,
      contact_number,
      email,
      barangay_id,
      purok_zone
    } = req.body;

    // Validate required fields
    const validation = validateYouthProfile(req.body);
    if (!validation.isValid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Generate IDs
    const youth_id = generateId('YTH', 'Youth_Profiling', 'youth_id');
    const user_id = generateId('USR', 'Users', 'user_id');

    // Check if email or contact number already exists
    const existingCheck = await client.query(`
      SELECT youth_id FROM "Youth_Profiling" 
      WHERE email = $1 OR contact_number = $2
    `, [email, contact_number]);

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Email or contact number already exists'
      });
    }

    // Create youth profile
    const youthQuery = `
      INSERT INTO "Youth_Profiling" (
        youth_id, first_name, last_name, middle_name, suffix,
        age, gender, contact_number, email, barangay_id, purok_zone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const youthResult = await client.query(youthQuery, [
      youth_id, first_name, last_name, middle_name || null, suffix || null,
      age, gender, contact_number, email, barangay_id, purok_zone || null
    ]);

    // Create user record
    const userQuery = `
      INSERT INTO "Users" (
        user_id, youth_id, email, user_type, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const userResult = await client.query(userQuery, [
      user_id, youth_id, email, 'youth', true
    ]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Youth profile created successfully',
      youth_id: youth_id,
      user_id: user_id,
      profile: {
        ...youthResult.rows[0],
        user_type: 'youth',
        is_active: true,
        created_at: userResult.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating youth profile:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error detail:', error.detail);
    console.error('❌ Error code:', error.code);
    console.error('❌ Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating youth profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get youth profile by ID
 */
const getYouthProfile = async (req, res) => {
  try {
    const { youth_id } = req.params;

    const query = `
      SELECT 
        yp.*,
        u.user_id,
        u.user_type,
        u.is_active,
        u.created_at as user_created_at,
        b.barangay_name
      FROM "Youth_Profiling" yp
      LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE yp.youth_id = $1
    `;

    const result = await db.query(query, [youth_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Youth profile not found'
      });
    }

    const profile = result.rows[0];

    return res.status(200).json({
      success: true,
      youth_id: profile.youth_id,
      user_id: profile.user_id,
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        middle_name: profile.middle_name,
        suffix: profile.suffix,
        age: profile.age,
        gender: profile.gender,
        contact_number: profile.contact_number,
        email: profile.email,
        barangay_id: profile.barangay_id,
        barangay_name: profile.barangay_name,
        purok_zone: profile.purok_zone,
        user_type: profile.user_type,
        is_active: profile.is_active,
        created_at: profile.user_created_at
      }
    });

  } catch (error) {
    console.error('Error getting youth profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving youth profile'
    });
  }
};

/**
 * Update youth profile
 */
const updateYouthProfile = async (req, res) => {
  try {
    const { youth_id } = req.params;
    const {
      first_name,
      last_name,
      middle_name,
      suffix,
      age,
      gender,
      contact_number,
      email,
      barangay_id,
      purok_zone
    } = req.body;

    // Validate required fields
    const validation = validateYouthProfile(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const query = `
      UPDATE "Youth_Profiling" 
      SET 
        first_name = $1,
        last_name = $2,
        middle_name = $3,
        suffix = $4,
        age = $5,
        gender = $6,
        contact_number = $7,
        email = $8,
        barangay_id = $9,
        purok_zone = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE youth_id = $11
      RETURNING *
    `;

    const result = await db.query(query, [
      first_name, last_name, middle_name || null, suffix || null,
      age, gender, contact_number, email, barangay_id, purok_zone || null,
      youth_id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Youth profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Youth profile updated successfully',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating youth profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating youth profile'
    });
  }
};

export {
  checkYouthProfile,
  createYouthProfile,
  getYouthProfile,
  updateYouthProfile
};
