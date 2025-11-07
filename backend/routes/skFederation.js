import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { getFederationByTerm, upsertFederationByTerm, getFederationPublicCurrent } from '../controllers/skFederationController.js';

const router = express.Router();

// Read federation officers for a term (admin protected)
router.get('/:termId', authenticateToken, requireRole('admin'), getFederationByTerm);

// Update federation officers for a term (admin only)
router.put('/:termId', authenticateToken, requireRole('admin'), upsertFederationByTerm);

// Public read-only endpoint for website banner/page
router.get('/public/current', getFederationPublicCurrent);

export default router;


