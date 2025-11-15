import express from 'express';
import {
  createIncident,
  getIncident,
  listIncidents,
  updateIncidentStatus,
  addIncidentUpdate,
  getIncidentStatistics,
} from '../controllers/securityIncidentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * Security Incident Routes
 * All routes require admin authentication
 */

// Get incident statistics
router.get('/statistics', authenticateToken, requireRole(['admin']), getIncidentStatistics);

// List incidents
router.get('/', authenticateToken, requireRole(['admin']), listIncidents);

// Get incident by ID
router.get('/:id', authenticateToken, requireRole(['admin']), getIncident);

// Create incident
router.post('/', authenticateToken, requireRole(['admin']), createIncident);

// Update incident status
router.patch('/:id/status', authenticateToken, requireRole(['admin']), updateIncidentStatus);

// Add incident update
router.post('/:id/updates', authenticateToken, requireRole(['admin']), addIncidentUpdate);

export default router;


