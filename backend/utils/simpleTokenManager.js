import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateJWTSecret } from './security.js';
import logger from './logger.js';

/**
 * Simplified Token Management System
 * Uses in-memory storage - no additional database tables required
 */

class SimpleTokenManager {
  constructor() {
    this.accessTokenExpiry = '30m';  // 30-minute access tokens
    this.refreshTokens = new Map();  // In-memory refresh token storage
    this.jwtSecret = this.getJWTSecret();
    
    // Cleanup expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
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
   * Generate enhanced access token with more security
   * @param {object} user - User object
   * @returns {string} - JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      userType: user.user_type,
      email: user.email,
      role: user.role_name,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(8).toString('hex') // Unique token ID
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'youth-governance-api',
      audience: 'youth-governance-web'
    });
  }

  /**
   * Generate simple refresh token (stored in memory)
   * @param {object} user - User object
   * @returns {string} - Refresh token
   */
  generateRefreshToken(user) {
    const tokenId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store in memory
    this.refreshTokens.set(tokenId, {
      userId: user.id,
      userType: user.user_type,
      email: user.email,
      expiresAt,
      createdAt: Date.now()
    });

    return tokenId;
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
      expiresIn: 1800, // 30 minutes in seconds
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

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {object} - Token data or null
   */
  validateRefreshToken(refreshToken) {
    const tokenData = this.refreshTokens.get(refreshToken);
    
    if (!tokenData) return null;
    if (Date.now() > tokenData.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      return null;
    }
    
    return tokenData;
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {object} - New access token or null
   */
  refreshAccessToken(refreshToken) {
    const tokenData = this.validateRefreshToken(refreshToken);
    if (!tokenData) return null;

    // Create user object for token generation
    const user = {
      id: tokenData.userId,
      user_type: tokenData.userType,
      email: tokenData.email,
      role_name: 'user' // Default role
    };

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 1800 // 30 minutes
    };
  }

  /**
   * Revoke refresh token
   * @param {string} refreshToken - Refresh token to revoke
   */
  revokeRefreshToken(refreshToken) {
    this.refreshTokens.delete(refreshToken);
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   * @param {string} userType - User type
   */
  revokeAllUserTokens(userId, userType) {
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId && data.userType === userType) {
        this.refreshTokens.delete(token);
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired refresh tokens`, { cleanedCount });
    }
  }

  /**
   * Get token statistics
   * @returns {object} - Token usage statistics
   */
  getTokenStats() {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;
    
    for (const data of this.refreshTokens.values()) {
      if (now > data.expiresAt) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    }

    return {
      totalTokens: this.refreshTokens.size,
      activeTokens,
      expiredTokens
    };
  }
}

// Create singleton instance
const simpleTokenManager = new SimpleTokenManager();

export default simpleTokenManager; 