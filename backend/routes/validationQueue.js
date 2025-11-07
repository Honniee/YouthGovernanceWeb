import express from 'express';
import {
  getValidationQueue,
  getValidationQueueStats,
  getCompletedValidationsToday,
  validateQueueItem,
  bulkValidateQueueItems,
  exportValidationQueue
} from '../controllers/validationQueueController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get validation queue items with filters and pagination
router.get('/', authenticateToken, getValidationQueue);

// Get validation queue statistics
router.get('/stats', authenticateToken, getValidationQueueStats);

// Get completed validations today
router.get('/completed-today', authenticateToken, getCompletedValidationsToday);

// Validate a single queue item (approve/reject)
router.patch('/:id/validate', authenticateToken, validateQueueItem);

// Bulk validate multiple queue items
router.patch('/bulk-validate', authenticateToken, bulkValidateQueueItems);

// Export validation queue data (logging endpoint)
router.get('/export', authenticateToken, exportValidationQueue);
// Also accept POST for environments that prefer payload in body
router.post('/export', authenticateToken, exportValidationQueue);

export default router;

