import { generateCSRFToken } from '../utils/security.js';
import logger from '../utils/logger.js';

/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 */

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of csrfTokens.entries()) {
    if (expiry < now) {
      csrfTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate and return CSRF token
 * Token is stored in memory and sent to client
 */
export const generateCSRF = (req, res, next) => {
  try {
    const token = generateCSRFToken();
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    csrfTokens.set(token, expiry);
    
    // Set token in cookie (httpOnly: false so JavaScript can read it)
    // For cross-origin requests: Use 'none' with secure: true
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSiteValue = isProduction ? 'none' : 'lax';
    const secureValue = isProduction;
    
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Must be readable by JavaScript for Double Submit Cookie pattern
      secure: secureValue, // Required for sameSite: 'none'
      sameSite: sameSiteValue, // 'none' for cross-origin, 'lax' for same-origin
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
    
    // Also send in response header
    res.setHeader('X-CSRF-Token', token);
    
    // Attach to request for use in response
    req.csrfToken = token;
    
    next();
  } catch (error) {
    logger.error('CSRF token generation failed', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate CSRF token' 
    });
  }
};

/**
 * Validate CSRF token on state-changing requests
 * Uses Double Submit Cookie pattern:
 * - Token sent in cookie (XSRF-TOKEN)
 * - Token sent in header (X-CSRF-Token) or body (csrfToken)
 * - Both must match and be valid
 */
export const validateCSRF = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  try {
    // Get token from cookie
    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    
    // Get token from header or body
    const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    const bodyToken = req.body?.csrfToken;
    const submittedToken = headerToken || bodyToken;
    
    // Check if token exists in cookie
    if (!cookieToken) {
      logger.warn('CSRF validation failed: No token in cookie', { 
        ip: req.ip, 
        url: req.originalUrl 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'CSRF token missing. Please refresh the page and try again.' 
      });
    }
    
    // Check if token was submitted
    if (!submittedToken) {
      logger.warn('CSRF validation failed: No token in request', { 
        ip: req.ip, 
        url: req.originalUrl 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'CSRF token missing. Please include X-CSRF-Token header.' 
      });
    }
    
    // Verify tokens match (Double Submit Cookie pattern)
    if (cookieToken !== submittedToken) {
      logger.warn('CSRF validation failed: Token mismatch', { 
        ip: req.ip, 
        url: req.originalUrl 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'CSRF token mismatch. Please refresh the page and try again.' 
      });
    }
    
    // Verify token exists in our store (not expired)
    const tokenExpiry = csrfTokens.get(cookieToken);
    if (!tokenExpiry || tokenExpiry < Date.now()) {
      logger.warn('CSRF validation failed: Token expired or invalid', { 
        ip: req.ip, 
        url: req.originalUrl 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'CSRF token expired. Please refresh the page and try again.' 
      });
    }
    
    // Token is valid - continue
    next();
  } catch (error) {
    logger.error('CSRF validation error', error, { 
      ip: req.ip, 
      url: req.originalUrl 
    });
    res.status(500).json({ 
      success: false, 
      message: 'CSRF validation failed' 
    });
  }
};

/**
 * Get CSRF token endpoint
 * Returns token for frontend to use
 */
export const getCSRFToken = (req, res) => {
  try {
    const token = req.csrfToken || generateCSRFToken();
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    
    csrfTokens.set(token, expiry);
    
    // For cross-origin requests: Use 'none' with secure: true
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSiteValue = isProduction ? 'none' : 'lax';
    const secureValue = isProduction;
    
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: secureValue, // Required for sameSite: 'none'
      sameSite: sameSiteValue, // 'none' for cross-origin, 'lax' for same-origin
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    res.json({ 
      success: true, 
      csrfToken: token 
    });
  } catch (error) {
    logger.error('Failed to get CSRF token', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get CSRF token' 
    });
  }
};

