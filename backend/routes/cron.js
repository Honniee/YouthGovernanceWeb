import express from 'express';
import { 
  updateTermStatuses, 
  manualUpdateTermStatuses, 
  getPendingStatusUpdates,
  manualTriggerClustering,
  getClusteringCronStatus
} from '../controllers/cronController.js';

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

// Manual trigger for clustering (for testing)
router.get('/manual-clustering', manualTriggerClustering);

// Get clustering cron job status
router.get('/clustering-status', getClusteringCronStatus);

export default router;
