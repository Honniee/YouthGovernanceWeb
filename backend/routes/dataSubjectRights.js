import express from 'express';
import {
  createRequest,
  getRequest,
  getRequestByToken,
  listRequests,
  updateRequestStatus,
  processAccessRequest,
  processRectificationRequest,
  processErasureRequest,
  processPortabilityRequest,
  processObjectionRequest,
  processConsentWithdrawalRequest,
  verifyIdentity,
  assignRequest,
  getRequestStatistics,
} from '../controllers/dataSubjectRightsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validateCSRF } from '../middleware/csrf.js';
import rateLimit from 'express-rate-limit';
import { verifyRecaptcha, bypassRecaptchaInDev } from '../middleware/recaptcha.js';

const router = express.Router();

/**
 * Data Subject Rights Routes
 * Public routes for creating requests (no auth required)
 * Public token-based access for viewing requests via email links
 * Admin routes for managing requests (requires admin auth)
 */

// Rate limiter for DSR request creation (anti-spam protection)
const dsrRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Maximum 3 requests per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many requests. Please wait 15 minutes before submitting another request. If you need immediate assistance, please contact the Data Protection Officer.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no authentication required for creating requests)
// Rate limited to prevent spam
// Note: Public endpoint - CSRF not required (reCAPTCHA provides protection)
router.post(
  '/requests',
  dsrRequestRateLimiter,
  process.env.NODE_ENV === 'production' ? verifyRecaptcha : bypassRecaptchaInDev,
  createRequest
);

// Public token-based access (for email links - no auth required)
router.get('/requests/by-token/:token', getRequestByToken);

// Authenticated routes (users can view their own requests)
router.get('/requests', authenticateToken, listRequests);
router.get('/requests/:id', authenticateToken, getRequest);

// Admin routes (require admin authentication) - SECURITY: CSRF protection applied
router.get('/statistics', authenticateToken, requireRole(['admin']), getRequestStatistics);
router.patch('/requests/:id/status', authenticateToken, requireRole(['admin']), validateCSRF, updateRequestStatus);
router.post('/requests/:id/verify-identity', authenticateToken, requireRole(['admin']), validateCSRF, verifyIdentity);
router.post('/requests/:id/assign', authenticateToken, requireRole(['admin']), validateCSRF, assignRequest);

// Request processing routes (admin only) - SECURITY: CSRF protection applied
router.post('/requests/:id/process-access', authenticateToken, requireRole(['admin']), validateCSRF, processAccessRequest);
router.post('/requests/:id/process-rectification', authenticateToken, requireRole(['admin']), validateCSRF, processRectificationRequest);
router.post('/requests/:id/process-erasure', authenticateToken, requireRole(['admin']), validateCSRF, processErasureRequest);
router.post('/requests/:id/process-portability', authenticateToken, requireRole(['admin']), validateCSRF, processPortabilityRequest);
router.post('/requests/:id/process-objection', authenticateToken, requireRole(['admin']), validateCSRF, processObjectionRequest);
router.post('/requests/:id/process-consent-withdrawal', authenticateToken, requireRole(['admin']), validateCSRF, processConsentWithdrawalRequest);

export default router;

