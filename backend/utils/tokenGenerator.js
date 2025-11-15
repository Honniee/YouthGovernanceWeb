import crypto from 'crypto';

/**
 * Token Generator Utility
 * Generates secure tokens for email links and temporary access
 */
class TokenGenerator {
  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Hex-encoded token
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a token with expiration
   * @param {number} expiresInHours - Token expiration in hours (default: 72)
   * @returns {object} Token object with token and expiration
   */
  static generateTokenWithExpiration(expiresInHours = 72) {
    const token = this.generateToken();
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + expiresInHours);

    return {
      token,
      expiration: expiration.toISOString(),
      expiresAt: expiration,
    };
  }

  /**
   * Hash a token for storage
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify a token matches its hash
   * @param {string} token - Token to verify
   * @param {string} hash - Stored hash
   * @returns {boolean} True if token matches
   */
  static verifyToken(token, hash) {
    const tokenHash = this.hashToken(token);
    return tokenHash === hash;
  }

  /**
   * Check if token is expired
   * @param {string} expirationDate - Expiration date (ISO string)
   * @returns {boolean} True if expired
   */
  static isTokenExpired(expirationDate) {
    if (!expirationDate) return true;
    return new Date(expirationDate) < new Date();
  }
}

export default TokenGenerator;


