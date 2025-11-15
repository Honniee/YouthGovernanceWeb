import axios from 'axios';
import { logSecurity } from '../utils/logger.js';
import logger from '../utils/logger.js';
import { STATUS_CODES, MESSAGES } from '../utils/constants.js';

/**
 * reCAPTCHA Verification Middleware
 * Verifies reCAPTCHA token with Google's API (Standard reCAPTCHA v2)
 */
export const verifyRecaptcha = async (req, res, next) => {
  try {
    const { recaptchaToken } = req.body;

    // Check if reCAPTCHA token is provided
    if (!recaptchaToken) {
      logSecurity('recaptcha_missing', { 
        ip: req.ip, 
        endpoint: req.originalUrl 
      });
      
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'reCAPTCHA verification is required',
        field: 'recaptcha'
      });
    }

    // Get secret key from environment (for standard reCAPTCHA)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      logger.error('reCAPTCHA secret key not configured');
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.SERVER_ERROR
      });
    }

    // Verify with Google reCAPTCHA API (Standard v2/v3)
    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const params = new URLSearchParams({
      secret: secretKey,
      response: recaptchaToken,
      remoteip: req.ip
    });

    const response = await axios.post(verificationUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 5000 // 5 second timeout
    });

    // reCAPTCHA Standard response format
    const { success, score, action, 'error-codes': errorCodes } = response.data;

    // Log the verification attempt
    logSecurity('recaptcha_verification', {
      success,
      score,
      action,
      errorCodes,
      ip: req.ip,
      endpoint: req.originalUrl
    });

    // Check if verification failed
    if (!success) {
      logSecurity('recaptcha_failed', {
        errorCodes,
        ip: req.ip,
        endpoint: req.originalUrl
      });

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'reCAPTCHA verification failed. Please try again.',
        field: 'recaptcha'
      });
    }

    // Check the risk score for v3 (0.0 = bot, 1.0 = human)
    // v2 doesn't return score, so this is optional
    if (typeof score !== 'undefined') {
      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5;
      
      if (score < minScore) {
        logSecurity('recaptcha_low_score', {
          score,
          minScore,
          ip: req.ip,
          endpoint: req.originalUrl
        });

        return res.status(STATUS_CODES.BAD_REQUEST).json({
          message: 'reCAPTCHA verification failed. Please try again.',
          field: 'recaptcha'
        });
      }
    }

    // reCAPTCHA verification successful
    logger.debug('reCAPTCHA verification successful', { ip: req.ip, endpoint: req.originalUrl });
    req.recaptchaVerified = true;
    next();

  } catch (error) {
    logger.error('reCAPTCHA verification error', { error: error.message, stack: error.stack, ip: req.ip });
    
    logSecurity('recaptcha_error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      endpoint: req.originalUrl
    });

    // If reCAPTCHA service is down, you might want to:
    // - Allow the request to proceed (less secure)
    // - Block the request (more secure)
    // For high-security applications, block the request:
    
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      message: 'reCAPTCHA verification service unavailable. Please try again later.'
    });
  }
};

/**
 * Optional reCAPTCHA verification
 * Logs failed verification but doesn't block the request
 */
export const optionalRecaptcha = async (req, res, next) => {
  try {
    await verifyRecaptcha(req, res, () => {
      // Verification successful, continue
      next();
    });
  } catch (error) {
    // Verification failed, but continue anyway (log for monitoring)
    logSecurity('optional_recaptcha_failed', {
      error: error.message,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    
    req.recaptchaVerified = false;
    next();
  }
};

/**
 * Rate limiting based on reCAPTCHA verification
 * Failed reCAPTCHA = stricter rate limits
 */
export const recaptchaRateLimit = (req, res, next) => {
  if (!req.recaptchaVerified) {
    // Apply stricter rate limiting for unverified requests
    req.rateLimitStrict = true;
  }
  next();
};

/**
 * Development bypass for reCAPTCHA
 * Only use in development environment
 */
export const bypassRecaptchaInDev = (req, res, next) => {
  // In development, bypass reCAPTCHA if no environment is set or if explicitly bypassed
  if (process.env.NODE_ENV !== 'production' && 
      (process.env.BYPASS_RECAPTCHA === 'true' || !process.env.RECAPTCHA_SECRET_KEY)) {
    logger.warn('reCAPTCHA bypassed in development mode', { ip: req.ip });
    req.recaptchaVerified = true;
    return next();
  }
  
  // In production or when reCAPTCHA is configured, use real verification
  return verifyRecaptcha(req, res, next);
}; 