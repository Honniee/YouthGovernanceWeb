import express from 'express';
import {
  createBackup,
  listBackups,
  restoreBackup,
  getBackupStatus,
} from '../controllers/backupController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Backup Routes
 * All routes require admin authentication
 */

// Get backup status
router.get('/status', authenticateToken, requireRole(['admin']), getBackupStatus);

// List available backups
router.get('/list', authenticateToken, requireRole(['admin']), listBackups);

// Create backup
router.post('/create', authenticateToken, requireRole(['admin']), createBackup);

// Restore backup
router.post('/restore', authenticateToken, requireRole(['admin']), restoreBackup);

export default router;


