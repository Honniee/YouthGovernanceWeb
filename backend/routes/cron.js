import express from 'express';
import { updateTermStatuses, manualUpdateTermStatuses, getPendingStatusUpdates } from '../controllers/cronController.js';

const router = express.Router();

/**
 * Cron Job Routes
 * These endpoints handle automated tasks and scheduled operations
 */

// Daily automatic term status update (called by cron job)
router.get('/update-term-statuses', updateTermStatuses);

// Manual trigger for term status updates (for testing)
router.get('/manual-update-term-statuses', manualUpdateTermStatuses);

// Get pending status updates (for monitoring)
router.get('/pending-status-updates', getPendingStatusUpdates);

export default router;
