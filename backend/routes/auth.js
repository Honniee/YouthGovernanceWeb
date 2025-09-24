import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { verifyRecaptcha, bypassRecaptchaInDev } from '../middleware/recaptcha.js';
import { loginRateLimiter, recordFailedAttempt, resetFailedAttempts } from '../middleware/rateLimiter.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;
  
  // Only enforce strong secret in production
  if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || jwtSecret === 'fallback-secret')) {
    throw new Error('JWT_SECRET must be set to a strong secret in production');
  }
  
  // Use fallback for development if needed
  const secret = jwtSecret || 'development-fallback-secret';
  
  return jwt.sign(
    { 
      userId: user.id || user.user_id, 
      userType: user.user_type,
      email: user.email 
    }, 
    secret,
    { expiresIn: '24h' }
  );
};

// @route   POST /api/auth/login
// @desc    Login user (LYDO, SK Official, or Youth)
// @access  Public
router.post('/login', [
  loginRateLimiter, // Add rate limiting
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  process.env.NODE_ENV === 'production' ? verifyRecaptcha : bypassRecaptchaInDev
], async (req, res) => {
  try {
    console.log('🚀 Login route started');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Please check your input and try again.',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    console.log('📧 Login attempt for email:', email);

    console.log('🔍 Starting database query for LYDO table...');
    // Check LYDO table first
    let userQuery = `
      SELECT l.lydo_id as id, l.email, l.password_hash, l.first_name, l.last_name, 
             l.middle_name, l.suffix, l.personal_email, l.profile_picture,
             l.is_active, l.email_verified, l.created_at, l.updated_at,
             r.role_name, r.permissions, l.role_id,
             CASE 
               WHEN r.role_name = 'admin' THEN 'admin'
               ELSE 'lydo_staff'
             END as user_type
      FROM "LYDO" l 
      JOIN "Roles" r ON l.role_id = r.role_id 
      WHERE l.email = $1 AND l.is_active = true
    `;
    
    console.log('📊 Executing LYDO query...');
    let result = await query(userQuery, [email]);
    console.log('✅ LYDO query completed, rows found:', result.rows.length);
    let user = result.rows[0];

    // If not found in LYDO, check SK Officials
    if (!user) {
      console.log('🔍 User not found in LYDO, checking SK Officials...');
      userQuery = `
        SELECT s.sk_id as id, s.email, s.password_hash, s.first_name, s.last_name, 
               s.is_active, r.role_name, r.permissions, 'sk_official' as user_type,
               s.position, b.barangay_name, s.account_access
        FROM "SK_Officials" s 
        JOIN "Roles" r ON s.role_id = r.role_id 
        JOIN "Barangay" b ON s.barangay_id = b.barangay_id
        WHERE s.email = $1 AND s.is_active = true AND s.account_access = true
      `;
      
      console.log('📊 Executing SK Officials query...');
      result = await query(userQuery, [email]);
      console.log('✅ SK Officials query completed, rows found:', result.rows.length);
      user = result.rows[0];
    }

    if (!user) {
      console.log('❌ User not found in any table');
      
      // Check if user exists but account access is disabled (for SK Officials)
      const disabledUserQuery = `
        SELECT s.sk_id, s.account_access, t.term_name, t.status as term_status
        FROM "SK_Officials" s 
        LEFT JOIN "SK_Terms" t ON s.term_id = t.term_id
        WHERE s.email = $1
      `;
      const disabledResult = await query(disabledUserQuery, [email]);
      
      if (disabledResult.rows.length > 0) {
        const disabledUser = disabledResult.rows[0];
        if (!disabledUser.account_access) {
          return res.status(401).json({ 
            success: false,
            message: 'Account access has been disabled. Your term has been completed and you no longer have access to the system.' 
          });
        }
      }
      
      // Record failed attempt
      recordFailedAttempt(req.ip || req.connection.remoteAddress);
      if (req.body.email) recordFailedAttempt(req.body.email);
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.' 
      });
    }

    console.log('✅ User found, checking password...');
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password check result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
      // Record failed attempt
      recordFailedAttempt(req.ip || req.connection.remoteAddress);
      recordFailedAttempt(req.body.email);
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.' 
      });
    }

    console.log('✅ Password verified, generating token...');
    // Debug logging
    console.log('🔍 Backend login debug:', {
      email: user.email,
      role_name: user.role_name,
      user_type: user.user_type,
      id: user.id
    });

    // Reset failed attempts on successful login
    resetFailedAttempts(req.ip || req.connection.remoteAddress);
    resetFailedAttempts(req.body.email);

    // Generate token
    const token = generateToken({
      user_id: user.id,
      user_type: user.user_type,
      email: user.email
    });
    console.log('🎫 Token generated successfully');

    console.log('📝 Logging activity to database...');
    // Log activity
    await query(`
      INSERT INTO "Activity_Logs" (log_id, user_id, user_type, action, resource_type, category, details)
      VALUES ($1, $2, $3, 'LOGIN', 'Authentication', 'Authentication', $4)
    `, [
      `ACT${Date.now()}`,
      user.id,
      user.user_type,
      JSON.stringify({ email: user.email, login_time: new Date() })
    ]);
    console.log('✅ Activity logged successfully');

    const responseUser = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        middleName: user.middle_name,
        suffix: user.suffix,
        personalEmail: user.personal_email,
        profilePicture: user.profile_picture,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleId: user.role_id,
        userType: user.user_type,
        role: user.role_name,
        permissions: user.permissions,
        position: user.position || null,
        barangay: user.barangay_name || null
    };

    console.log('📤 Backend response user:', responseUser);
    console.log('🚀 Sending successful login response...');

    res.json({
      token,
      user: responseUser
    });
    
    console.log('✅ Login response sent successfully');

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong. Please try again later.' 
    });
  }
});

// @route   POST /api/auth/register-youth
// @desc    Register a new youth (public registration)
// @access  Public
router.post('/register-youth', [
  body('email').isEmail().normalizeEmail(),
  body('firstName').isLength({ min: 2 }),
  body('lastName').isLength({ min: 2 }),
  body('contactNumber').isMobilePhone(),
  body('birthDate').isISO8601(),
  body('gender').isIn(['Male', 'Female']),
  body('barangayId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Please check your input and try again.',
        errors: errors.array() 
      });
    }

    const {
      email, firstName, lastName, middleName, suffix,
      contactNumber, birthDate, gender, barangayId, purokZone
    } = req.body;

    // Check if email already exists
    const existingUser = await query(
      'SELECT youth_id FROM "Youth_Profiling" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'This email is already registered. Please use a different email address.' 
      });
    }

    // Calculate age
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();

    // Generate youth ID
    const youthId = `YTH${Date.now()}`;

    // Insert youth profile
    await query(`
      INSERT INTO "Youth_Profiling" (
        youth_id, first_name, last_name, middle_name, suffix,
        barangay_id, purok_zone, birth_date, age, gender,
        contact_number, email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      youthId, firstName, lastName, middleName || null, suffix || null,
      barangayId, purokZone || null, birthDate, age, gender,
      contactNumber, email
    ]);

    // Create user record
    const userId = `USR${Date.now()}`;
    await query(`
      INSERT INTO "Users" (user_id, user_type, youth_id)
      VALUES ($1, 'youth', $2)
    `, [userId, youthId]);

    res.status(201).json({
      message: 'Youth registration successful',
      youthId: youthId,
      userId: userId
    });

  } catch (error) {
    console.error('Youth registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong during registration. Please try again later.' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please log in again.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user details based on user type
    let userQuery, user;
    
    if (decoded.userType === 'lydo_staff' || decoded.userType === 'admin') {
      userQuery = `
        SELECT l.lydo_id as id, l.email, l.first_name, l.last_name, 
               l.middle_name, l.suffix, l.personal_email, l.profile_picture,
               l.is_active, l.email_verified, l.created_at, l.updated_at,
               r.role_name, r.permissions, l.role_id,
               CASE 
                 WHEN r.role_name = 'admin' THEN 'admin'
                 ELSE 'lydo_staff'
               END as user_type
        FROM "LYDO" l 
        JOIN "Roles" r ON l.role_id = r.role_id 
        WHERE l.lydo_id = $1 AND l.is_active = true
      `;
    } else if (decoded.userType === 'sk_official') {
      userQuery = `
        SELECT s.sk_id as id, s.email, s.first_name, s.last_name, 
               r.role_name, r.permissions, 'sk_official' as user_type,
               s.position, b.barangay_name, s.account_access
        FROM "SK_Officials" s 
        JOIN "Roles" r ON s.role_id = r.role_id 
        JOIN "Barangay" b ON s.barangay_id = b.barangay_id
        WHERE s.sk_id = $1 AND s.is_active = true AND s.account_access = true
      `;
    } else if (decoded.userType === 'youth') {
      userQuery = `
        SELECT y.youth_id as id, y.email, y.first_name, y.last_name, 
               'youth' as user_type, b.barangay_name
        FROM "Youth_Profiling" y 
        JOIN "Barangay" b ON y.barangay_id = b.barangay_id
        WHERE y.youth_id = $1 AND y.is_active = true
      `;
    }

    const result = await query(userQuery, [decoded.userId]);
    user = result.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found. Please log in again.' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        middleName: user.middle_name,
        suffix: user.suffix,
        personalEmail: user.personal_email,
        profilePicture: user.profile_picture,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleId: user.role_id,
        userType: user.user_type,
        role: user.role_name || 'Youth',
        permissions: user.permissions || {},
        position: user.position || null,
        barangay: user.barangay_name || null
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong. Please try again later.' 
    });
  }
});

// @route   PUT /api/auth/me
// @desc    Update current LYDO user's profile (first/last/middle/suffix/personal_email/profile_picture)
// @access  Private
router.put('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Only LYDO/admin accounts are supported for profile updates for now
    if (!(decoded.userType === 'lydo_staff' || decoded.userType === 'admin')) {
      return res.status(403).json({ success: false, message: 'Only LYDO users can update their profile.' });
    }

    const allowedFields = ['first_name', 'last_name', 'middle_name', 'suffix', 'personal_email', 'profile_picture'];
    const updates = [];
    const values = [];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${updates.length + 1}`);
        values.push(req.body[field] === '' ? null : req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    // Push lydo_id as the last parameter
    values.push(decoded.userId || decoded.user_id);

    const updateQuery = `
      UPDATE "LYDO"
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE lydo_id = $${values.length}
      RETURNING lydo_id as id, email, first_name, last_name, middle_name, suffix, personal_email, profile_picture,
                is_active, email_verified, created_at, updated_at, role_id;
    `;

    const result = await query(updateQuery, values);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Fetch role info for response
    const roleResult = await query(
      `SELECT r.role_name, r.permissions FROM "LYDO" l JOIN "Roles" r ON l.role_id = r.role_id WHERE l.lydo_id = $1`,
      [user.id]
    );
    const roleInfo = roleResult.rows[0] || {};

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        middleName: user.middle_name,
        suffix: user.suffix,
        personalEmail: user.personal_email,
        profilePicture: user.profile_picture,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleId: user.role_id,
        userType: decoded.userType,
        role: roleInfo.role_name,
        permissions: roleInfo.permissions
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and log activity
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    console.log('🚪 Logout route started');
    
    const { id: user_id, userType: user_type, email } = req.user;
    console.log('👤 Logging out user:', { user_id, user_type, email });

    // Log logout activity
    await query(`
      INSERT INTO "Activity_Logs" (log_id, user_id, user_type, action, resource_type, category, details)
      VALUES ($1, $2, $3, 'LOGOUT', 'Session', 'Authentication', $4)
    `, [
      `ACT${Date.now()}`,
      user_id,
      user_type,
      JSON.stringify({ 
        email: email, 
        logout_time: new Date(),
        source: req.body.source || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      })
    ]);
    console.log('✅ Logout activity logged successfully');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong during logout.' 
    });
  }
});

export default router; 