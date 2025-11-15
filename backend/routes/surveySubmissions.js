import express from 'express';
import { getSubmissionByToken, resendEmail } from '../controllers/surveySubmissionController.js';
import { verifyRecaptcha, bypassRecaptchaInDev } from '../middleware/recaptcha.js';
import { resendEmailLimiter } from '../middleware/rateLimiter.js';
import { validateCSRF } from '../middleware/csrf.js';

const router = express.Router();

/**
 * Survey Submission Routes
 * Public routes for token-based access to survey submissions
 */

// Public token-based access (for email links - no auth required)
router.get('/by-token/:token', getSubmissionByToken);

// Resend email with new token (public - requires reCAPTCHA verification and rate limiting)
// Note: Public endpoint - CSRF not required (reCAPTCHA provides protection)
router.post('/resend-email', 
  resendEmailLimiter, // Rate limit: 3 requests per hour per youth_id + email
  process.env.NODE_ENV === 'production' ? verifyRecaptcha : bypassRecaptchaInDev,
  resendEmail
);

export default router;


