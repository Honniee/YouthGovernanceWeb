import express from 'express';
import {
  getValidationQueue,
  getValidationQueueStats,
  getCompletedValidationsToday,
  validateQueueItem,
  bulkValidateQueueItems,
  exportValidationQueue,
  reassignResponseToNewYouth
} from '../controllers/validationQueueController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCSRF } from '../middleware/csrf.js';

const router = express.Router();

// Get validation queue items with filters and pagination
router.get('/', authenticateToken, getValidationQueue);

// Get validation queue statistics
router.get('/stats', authenticateToken, getValidationQueueStats);

// Get completed validations today
router.get('/completed-today', authenticateToken, getCompletedValidationsToday);

// Validate a single queue item (approve/reject) - SECURITY: CSRF protection applied
router.patch('/:id/validate', authenticateToken, validateCSRF, validateQueueItem);

// Reassign survey response to a different youth profile - SECURITY: CSRF protection applied
router.post('/:id/reassign', authenticateToken, validateCSRF, reassignResponseToNewYouth);

// Bulk validate multiple queue items - SECURITY: CSRF protection applied
router.patch('/bulk-validate', authenticateToken, validateCSRF, bulkValidateQueueItems);

// Export validation queue data (logging endpoint)
router.get('/export', authenticateToken, exportValidationQueue);
// Also accept POST for environments that prefer payload in body
router.post('/export', authenticateToken, exportValidationQueue);

export default router;

