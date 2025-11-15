import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { validateJWTSecret } from './security.js';
import logger from './logger.js';

/**
 * Advanced Token Management System
 * Implements access/refresh token pattern for enhanced security
 */

class TokenManager {
  constructor() {
    this.accessTokenExpiry = '15m';  // Short-lived access tokens
    this.refreshTokenExpiry = '7d';  // Longer-lived refresh tokens
    this.jwtSecret = this.getJWTSecret();
  }

  /**
   * Get and validate JWT secret
   */
  getJWTSecret() {
    const secret = process.env.JWT_SECRET;
    
    // Strict validation: Fail fast if JWT_SECRET is not set in production
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    
    // Validate secret strength
    if (secret) {
      const validation = validateJWTSecret(secret);
      if (!validation.isValid && process.env.NODE_ENV === 'production') {
        throw new Error(`JWT Secret validation failed: ${validation.issues.join(', ')}`);
      }
    }
    
    // Use fallback ONLY in development/test environments
    return secret || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : 'development-fallback-secret');
  }

  /**
   * Generate access token (short-lived)
   * @param {object} user - User object
   * @returns {string} - JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      userType: user.user_type,
      email: user.email,
      role: user.role_name,
      tokenType: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'youth-governance-api',
      audience: 'youth-governance-web'
    });
  }

  /**
   * Generate refresh token (long-lived)
   * @param {object} user - User object
   * @returns {string} - JWT refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      userType: user.user_type,
      tokenType: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'youth-governance-api',
      audience: 'youth-governance-web'
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {object} user - User object
   * @returns {object} - Token pair with metadata
   */
  generateTokenPair(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      refreshExpiresIn: 604800 // 7 days in seconds
    };
  }

  /**
   * Verify access token
   * @param {string} token - Access token
   * @returns {object} - Decoded token or null
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'youth-governance-api',
        audience: 'youth-governance-web'
      });

      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token
   * @returns {object} - Decoded token or null
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'youth-governance-api',
        audience: 'youth-governance-web'
      });

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store refresh token in database
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {string} userType - User type
   */
  async storeRefreshToken(userId, refreshToken, userType) {
    try {
      // Decode to get JTI
      const decoded = jwt.decode(refreshToken);
      const jti = decoded.jti;
      const expiresAt = new Date(decoded.exp * 1000);

      // Store in database
      await query(`
        INSERT INTO "Refresh_Tokens" (
          token_id, user_id, user_type, token_hash, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        jti,
        userId,
        userType,
        crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expiresAt
      ]);
    } catch (error) {
      logger.error('Error storing refresh token', { error: error.message, stack: error.stack, userId, userType });
      throw error;
    }
  }

  /**
   * Validate refresh token against database
   * @param {string} refreshToken - Refresh token
   * @returns {boolean} - Validation result
   */
  async validateRefreshToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) return false;

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const result = await query(`
        SELECT token_id FROM "Refresh_Tokens"
        WHERE token_id = $1 AND token_hash = $2 AND expires_at > NOW() AND revoked = FALSE
      `, [decoded.jti, tokenHash]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error validating refresh token', { error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Revoke refresh token
   * @param {string} refreshToken - Refresh token to revoke
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (!decoded || !decoded.jti) return;

      await query(`
        UPDATE "Refresh_Tokens"
        SET revoked = TRUE, revoked_at = NOW()
        WHERE token_id = $1
      `, [decoded.jti]);
    } catch (error) {
      logger.error('Error revoking refresh token', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   * @param {string} userType - User type
   */
  async revokeAllUserTokens(userId, userType) {
    try {
      await query(`
        UPDATE "Refresh_Tokens"
        SET revoked = TRUE, revoked_at = NOW()
        WHERE user_id = $1 AND user_type = $2 AND revoked = FALSE
      `, [userId, userType]);
    } catch (error) {
      logger.error('Error revoking all user tokens', { error: error.message, stack: error.stack, userId, userType });
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await query(`
        DELETE FROM "Refresh_Tokens"
        WHERE expires_at < NOW() OR revoked = TRUE
      `);
      
      logger.info(`Cleaned up ${result.rowCount} expired/revoked tokens`, { rowCount: result.rowCount });
    } catch (error) {
      logger.error('Error cleaning up tokens', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Get token statistics
   * @returns {object} - Token usage statistics
   */
  async getTokenStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN revoked = TRUE THEN 1 END) as revoked_tokens,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
          COUNT(CASE WHEN expires_at > NOW() AND revoked = FALSE THEN 1 END) as active_tokens
        FROM "Refresh_Tokens"
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting token stats', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {object} - New token pair or null
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Validate refresh token
      const isValid = await this.validateRefreshToken(refreshToken);
      if (!isValid) return null;

      // Decode refresh token to get user info
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) return null;

      // Get fresh user data from database
      const user = await this.getUserById(decoded.userId, decoded.userType);
      if (!user || !user.is_active) return null;

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          role: user.role_name
        }
      };
    } catch (error) {
      logger.error('Error refreshing access token', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Get user by ID and type
   * @param {string} userId - User ID
   * @param {string} userType - User type
   * @returns {object} - User object or null
   */
  async getUserById(userId, userType) {
    try {
      let userQuery;
      
      switch (userType) {
        case 'lydo_staff':
          userQuery = `
            SELECT l.lydo_id as id, l.email, l.first_name, l.last_name, 
                   l.is_active, r.role_name, r.permissions, 'lydo_staff' as user_type
            FROM "LYDO" l 
            JOIN "Roles" r ON l.role_id = r.role_id 
            WHERE l.lydo_id = $1 AND l.is_active = true
          `;
          break;
        case 'sk_official':
          userQuery = `
            SELECT s.sk_id as id, s.email, s.first_name, s.last_name, 
                   s.is_active, r.role_name, r.permissions, 'sk_official' as user_type
            FROM "SK_Officials" s 
            JOIN "Roles" r ON s.role_id = r.role_id 
            WHERE s.sk_id = $1 AND s.is_active = true
          `;
          break;
        case 'youth':
          userQuery = `
            SELECT y.youth_id as id, y.email, y.first_name, y.last_name, 
                   y.is_active, 'youth' as user_type, 'youth' as role_name
            FROM "Youth_Profiling" y 
            WHERE y.youth_id = $1 AND y.is_active = true
          `;
          break;
        default:
          return null;
      }

      const result = await query(userQuery, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by ID', { error: error.message, stack: error.stack, userId, userType });
      return null;
    }
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

// Export instance and class
export default tokenManager;
export { TokenManager }; 