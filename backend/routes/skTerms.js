import express from 'express';
import skTermsController from '../controllers/skTermsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/active', skTermsController.getActiveTerm);
router.get('/public/chairpersons-by-barangay', skTermsController.getPublicChairpersonsByBarangay);
router.get('/public/officials-by-barangay', skTermsController.getPublicOfficialsByBarangay);

// All other routes require authentication
router.use(authenticateToken);

// === TERM MANAGEMENT ROUTES ===
router.get('/', skTermsController.getAllTerms);
router.get('/history', skTermsController.getTermHistory);
router.get('/statistics', skTermsController.getTermStatistics);
router.get('/export', skTermsController.exportSKTerms);

// === INDIVIDUAL TERM ROUTES ===
router.get('/:id', skTermsController.getTermById);
router.post('/', requireRole(['admin']), skTermsController.createTerm);
router.put('/:id', requireRole(['admin']), skTermsController.updateTerm);
router.delete('/:id', requireRole(['admin']), skTermsController.deleteTerm);

// === TERM STATUS MANAGEMENT ===
router.patch('/:id/status', requireRole(['admin']), skTermsController.updateTermStatus);
router.patch('/:id/activate', requireRole(['admin']), skTermsController.activateTerm);
router.patch('/:id/complete', requireRole(['admin']), skTermsController.completeTerm);
router.patch('/:id/extend', requireRole(['admin']), skTermsController.extendTerm);

// === DEBUG ROUTES ===
router.get('/debug/status', requireRole(['admin']), skTermsController.debugTermStatus);
router.get('/suggested-dates', requireRole(['admin']), skTermsController.getSuggestedDates);

// === TERM-SPECIFIC DATA ===
router.get('/:id/officials', skTermsController.getTermOfficials);
router.get('/:id/statistics', skTermsController.getTermSpecificStats);
router.get('/:id/officials-by-barangay', skTermsController.getTermOfficialsByBarangay);
router.get('/:id/export-detailed', skTermsController.exportTermDetailed);

export default router;
