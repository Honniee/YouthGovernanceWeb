import axios from 'axios';
import { logSecurity } from '../utils/logger.js';
import { STATUS_CODES, MESSAGES } from '../utils/constants.js';

/**
 * reCAPTCHA Verification Middleware
 * Verifies reCAPTCHA token with Google's API
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

    // Get API key from environment (for reCAPTCHA Enterprise)
    const apiKey = process.env.RECAPTCHA_API_KEY;
    const projectId = process.env.RECAPTCHA_PROJECT_ID || 'ee-21-03787'; // Your Google Cloud Project ID
    
    if (!apiKey) {
      console.error('reCAPTCHA API key not configured');
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.SERVER_ERROR
      });
    }

    // Verify with Google reCAPTCHA Enterprise API
    const verificationUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
    const verificationData = {
      event: {
        token: recaptchaToken,
        expectedAction: "LOGIN",
        siteKey: "6LcW7KErAAAAAL1YkHfgboexcJAJf99tgjU6xCWu"
      }
    };

    const response = await axios.post(verificationUrl, verificationData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });

    // reCAPTCHA Enterprise response format
    const { tokenProperties, riskAnalysis, event } = response.data;
    const success = tokenProperties?.valid || false;
    const score = riskAnalysis?.score;
    const action = tokenProperties?.action;

    // Log the verification attempt
    logSecurity('recaptcha_verification', {
      success,
      score,
      action,
      valid: tokenProperties?.valid,
      ip: req.ip,
      endpoint: req.originalUrl
    });

    // Check if verification failed
    if (!success) {
      logSecurity('recaptcha_failed', {
        reason: tokenProperties?.invalidReason,
        ip: req.ip,
        endpoint: req.originalUrl
      });

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: 'reCAPTCHA verification failed. Please try again.',
        field: 'recaptcha'
      });
    }

    // Check the risk score (0.0 = bot, 1.0 = human)
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
    req.recaptchaVerified = true;
    next();

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    
    logSecurity('recaptcha_error', {
      error: error.message,
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
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_RECAPTCHA === 'true') {
    console.log('⚠️  reCAPTCHA bypassed in development mode');
    req.recaptchaVerified = true;
    return next();
  }
  
  // In production, use real reCAPTCHA verification
  return verifyRecaptcha(req, res, next);
}; 