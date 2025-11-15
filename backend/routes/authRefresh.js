import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Generate JWT token function (same as in auth.js)
const generateToken = (user, expiresIn = '15m') => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    logger.warn('JWT_SECRET is not set. Using development fallback (INSECURE - not for production)');
  }
  
  if (process.env.NODE_ENV === 'production' && 
      (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || 
       jwtSecret === 'fallback-secret' || 
       jwtSecret === 'development-fallback-secret')) {
    throw new Error('JWT_SECRET must be set to a strong, unique secret in production');
  }
  
  const secret = jwtSecret || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : 'development-fallback-secret');
  
  return jwt.sign(
    { 
      userId: user.id || user.user_id, 
      userType: user.user_type,
      email: user.email 
    }, 
    secret,
    { expiresIn }
  );
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token cookie)
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Hash the refresh token to look it up in database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Verify refresh token exists and is valid
    const result = await query(`
      SELECT user_id, user_type, expires_at, revoked_at
      FROM "Refresh_Tokens"
      WHERE token_hash = $1
    `, [tokenHash]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const tokenData = result.rows[0];

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Clean up expired token
      await query(`DELETE FROM "Refresh_Tokens" WHERE token_hash = $1`, [tokenHash]);
      
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    // Check if token was revoked
    if (tokenData.revoked_at) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    // Get user email for token generation
    let userEmail;
    switch (tokenData.user_type) {
      case 'admin':
      case 'lydo_staff':
        const lydoResult = await query(`SELECT email FROM "LYDO" WHERE lydo_id = $1`, [tokenData.user_id]);
        userEmail = lydoResult.rows[0]?.email;
        break;
      case 'sk_official':
        const skResult = await query(`SELECT email FROM "SK_Officials" WHERE sk_id = $1`, [tokenData.user_id]);
        userEmail = skResult.rows[0]?.email;
        break;
      case 'youth':
        const youthResult = await query(`SELECT email FROM "Youth_Profiling" WHERE youth_id = $1`, [tokenData.user_id]);
        userEmail = youthResult.rows[0]?.email;
        break;
    }

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken({
      user_id: tokenData.user_id,
      user_type: tokenData.user_type,
      email: userEmail
    }, '15m');

    // Set new access token in httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    // For cross-origin requests: Use 'none' with secure: true
    const sameSiteValue = isProduction ? 'none' : 'lax';
    const secureValue = isProduction;
    
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: secureValue, // Required for sameSite: 'none'
      sameSite: sameSiteValue, // 'none' for cross-origin, 'lax' for same-origin
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    logger.debug('Access token refreshed', { 
      userId: tokenData.user_id, 
      userType: tokenData.user_type 
    });

    res.json({
      success: true,
      message: 'Access token refreshed'
    });

  } catch (error) {
    logger.error('Refresh token error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
});

export default router;

