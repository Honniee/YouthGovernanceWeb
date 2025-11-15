import express from 'express';
import {
  processRetention,
  getRetentionStatistics,
  updateYouthRetentionDates,
  updateSurveyRetentionDates,
} from '../controllers/dataRetentionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Data Retention Routes
 * All routes require admin authentication
 */

// Get retention statistics
router.get('/statistics', authenticateToken, requireRole(['admin']), getRetentionStatistics);

// Process data retention checks
router.post('/process', authenticateToken, requireRole(['admin']), processRetention);

// Update youth retention dates
router.post('/update-youth-dates', authenticateToken, requireRole(['admin']), updateYouthRetentionDates);

// Update survey response retention dates
router.post('/update-survey-dates', authenticateToken, requireRole(['admin']), updateSurveyRetentionDates);

export default router;


