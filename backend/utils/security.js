import crypto from 'crypto';

/**
 * Security utilities for the application
 */

/**
 * Generate a cryptographically secure JWT secret
 * @param {number} length - Length of the secret (default: 64 bytes = 512 bits)
 * @returns {string} - Base64 encoded secure secret
 */
export const generateJWTSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('base64');
};

/**
 * Validate JWT secret strength
 * @param {string} secret - JWT secret to validate
 * @returns {object} - Validation result with strength assessment
 */
export const validateJWTSecret = (secret) => {
  const result = {
    isValid: false,
    strength: 'weak',
    issues: [],
    recommendations: []
  };

  if (!secret) {
    result.issues.push('JWT secret is missing');
    result.recommendations.push('Generate a strong JWT secret');
    return result;
  }

  // Check length
  if (secret.length < 32) {
    result.issues.push('JWT secret is too short (minimum 32 characters)');
    result.recommendations.push('Use at least 32 characters for JWT secret');
  }

  // Check for default/weak secrets
  const weakSecrets = [
    'your-super-secret-jwt-key-change-this-in-production',
    'development-fallback-secret',
    'fallback-secret',
    'secret',
    'jwt-secret',
    '123456',
    'password'
  ];

  if (weakSecrets.includes(secret)) {
    result.issues.push('Using a default or commonly known secret');
    result.recommendations.push('Generate a unique, random secret');
  }

  // Check complexity
  const hasNumbers = /\d/.test(secret);
  const hasLowercase = /[a-z]/.test(secret);
  const hasUppercase = /[A-Z]/.test(secret);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

  let complexityScore = 0;
  if (hasNumbers) complexityScore++;
  if (hasLowercase) complexityScore++;
  if (hasUppercase) complexityScore++;
  if (hasSpecialChars) complexityScore++;

  // Determine strength
  if (secret.length >= 64 && complexityScore >= 3) {
    result.strength = 'strong';
    result.isValid = true;
  } else if (secret.length >= 32 && complexityScore >= 2) {
    result.strength = 'medium';
    result.isValid = true;
  } else {
    result.strength = 'weak';
    result.recommendations.push('Use a longer secret with mixed characters');
  }

  if (result.issues.length === 0 && result.isValid) {
    result.issues.push('JWT secret meets security requirements');
  }

  return result;
};

/**
 * Generate secure session ID
 * @returns {string} - Secure session identifier
 */
export const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate secure API key
 * @param {string} prefix - Optional prefix for the API key
 * @returns {string} - Secure API key
 */
export const generateAPIKey = (prefix = 'yg') => {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${randomPart}`;
};

/**
 * Hash sensitive data (for storage)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt (will generate if not provided)
 * @returns {object} - Hash and salt
 */
export const hashSensitiveData = (data, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  
  return { hash, salt };
};

/**
 * Verify hashed data
 * @param {string} data - Original data
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {boolean} - Verification result
 */
export const verifyHashedData = (data, hash, salt) => {
  const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

/**
 * Generate CSRF token
 * @returns {string} - CSRF token
 */
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64url');
};

/**
 * Rate limiting key generator
 * @param {string} ip - Client IP address
 * @param {string} endpoint - API endpoint
 * @returns {string} - Rate limiting key
 */
export const generateRateLimitKey = (ip, endpoint = '') => {
  return `rate_limit:${ip}:${endpoint}`;
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com", "https://www.recaptcha.net"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com", "https://recaptcha.google.com"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Additional security headers
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin'
};

/**
 * Environment security checker
 */
export const checkEnvironmentSecurity = () => {
  const issues = [];
  const recommendations = [];

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    issues.push('Not running in production mode');
    recommendations.push('Set NODE_ENV=production for production deployment');
  }

  // Check JWT secret
  const jwtValidation = validateJWTSecret(process.env.JWT_SECRET);
  if (!jwtValidation.isValid) {
    issues.push(`JWT Secret: ${jwtValidation.issues.join(', ')}`);
    recommendations.push(...jwtValidation.recommendations);
  }

  // Check database URL
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    issues.push('Database configuration missing');
    recommendations.push('Configure database connection properly');
  }

  // Check reCAPTCHA
  if (!process.env.RECAPTCHA_API_KEY && !process.env.RECAPTCHA_SECRET_KEY) {
    issues.push('reCAPTCHA configuration missing');
    recommendations.push('Configure reCAPTCHA for bot protection');
  }

  return { issues, recommendations, isSecure: issues.length === 0 };
};

export default {
  generateJWTSecret,
  validateJWTSecret,
  generateSessionId,
  generateAPIKey,
  hashSensitiveData,
  verifyHashedData,
  generateCSRFToken,
  generateRateLimitKey,
  securityHeaders,
  checkEnvironmentSecurity
}; 