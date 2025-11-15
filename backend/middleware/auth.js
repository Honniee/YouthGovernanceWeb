import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // SECURITY: Get token from httpOnly cookie first, fallback to header for backward compatibility
    let token = req.cookies?.accessToken;
    
    // Fallback to Authorization header (for backward compatibility during migration)
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    
    // Strict validation: Fail fast if JWT_SECRET is not set or is default
    if (!jwtSecret) {
      const errorMsg = process.env.NODE_ENV === 'production' 
        ? 'JWT_SECRET must be set in production environment'
        : 'JWT_SECRET is not set. Using development fallback (INSECURE - not for production)';
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg);
      }
      logger.warn(errorMsg);
    }
    
    // Check for default/placeholder secrets
    if (process.env.NODE_ENV === 'production' && 
        (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || 
         jwtSecret === 'fallback-secret' || 
         jwtSecret === 'development-fallback-secret')) {
      throw new Error('JWT_SECRET must be set to a strong, unique secret in production');
    }
    
    // Use fallback ONLY in development/test environments
    const secret = jwtSecret || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : 'development-fallback-secret');
    
    // Warn if using fallback in non-test environments
    if (!jwtSecret && process.env.NODE_ENV !== 'test') {
      logger.warn('Using fallback JWT secret - This is INSECURE and should only be used in development');
    }
    
    const decoded = jwt.verify(token, secret);
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Token decoded', { userId: decoded.userId, userType: decoded.userType });
    }
    
    // Get fresh user data from database
    let userQuery;
    let userParams = [decoded.userId];

    switch (decoded.userType) {
      case 'admin':
      case 'lydo_staff':
        userQuery = `
          SELECT l.lydo_id as id, l.email, l.first_name, l.last_name, 
                 l.is_active, r.role_name, r.permissions, 
                 CASE 
                   WHEN r.role_name = 'admin' THEN 'admin'
                   ELSE 'lydo_staff'
                 END as user_type
          FROM "LYDO" l 
          JOIN "Roles" r ON l.role_id = r.role_id 
          WHERE l.lydo_id = $1 AND l.is_active = true
        `;
        break;
      
      case 'sk_official':
        userQuery = `
          SELECT s.sk_id as id, s.email, s.first_name, s.last_name, 
                 s.is_active, r.role_name, r.permissions, 'sk_official' as user_type,
                 s.position, b.barangay_name, s.account_access
          FROM "SK_Officials" s 
          JOIN "Roles" r ON s.role_id = r.role_id 
          JOIN "Barangay" b ON s.barangay_id = b.barangay_id
          WHERE s.sk_id = $1 AND s.is_active = true AND s.account_access = true
        `;
        break;
      
      case 'youth':
        userQuery = `
          SELECT y.youth_id as id, y.email, y.first_name, y.last_name, 
                 y.is_active, 'youth' as user_type, b.barangay_name
          FROM "Youth_Profiling" y 
          JOIN "Barangay" b ON y.barangay_id = b.barangay_id
          WHERE y.youth_id = $1 AND y.is_active = true
        `;
        break;
      
      default:
        return res.status(401).json({ 
          message: 'Invalid user type in token.' 
        });
    }

    const result = await query(userQuery, userParams);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ 
        message: 'User not found or inactive.' 
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      role: user.role_name || 'youth',
      permissions: user.permissions || null,
      position: user.position || null,
      barangay: user.barangay_name || null,
      isActive: user.is_active
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired.' 
      });
    }
    
    logger.error('Auth middleware error', { 
      message: error.message, 
      name: error.name,
      stack: error.stack 
    });
    return res.status(500).json({ 
      message: 'Authentication failed.' 
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      req.user = null;
      return next();
    }

    // Use the same logic as authenticateToken but don't fail
    await authenticateToken(req, res, next);
  } catch (error) {
    // If authentication fails, continue without user
    req.user = null;
    next();
  }
}; 