import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { staffLimiter, bulkOperationLimiter, exportLimiter } from '../middleware/rateLimiter.js';
import { validateCSRF } from '../middleware/csrf.js';
// import { staffAuditLogger } from '../middleware/auditLogger.js';
import { 
  listStaff, 
  getStaffById, 
  createStaff, 
  updateStaff, 
  updateStatus, 
  deleteStaffSoft,
  bulkUpdateStatus,
  exportStaff
} from '../controllers/staffController.js';
import { 
  bulkImportStaff, 
  getBulkImportTemplate, 
  upload,
  validateStaffBulkImportFile
} from '../controllers/bulkImportController.js';

const router = express.Router();

// Apply rate limiting and audit logging to all staff routes
// router.use(staffLimiter); // Temporarily disabled for development
// router.use(staffAuditLogger);

// Everyone authenticated can list/view (admin and lydo_staff); staff has read-only per permissions enforced at UI/API policy
router.get('/', authenticateToken, listStaff);

// Export functionality (admin only) - Must come before /:id route
router.get('/export', authenticateToken, requireRole('admin'), exportStaff);

router.get('/:id', authenticateToken, getStaffById);

// Admin-only mutations - SECURITY: CSRF protection applied
router.post('/', authenticateToken, requireRole('admin'), validateCSRF, createStaff);
router.put('/:id', authenticateToken, requireRole('admin'), validateCSRF, updateStaff);
router.patch('/:id/status', authenticateToken, requireRole('admin'), validateCSRF, updateStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), validateCSRF, deleteStaffSoft);

// Bulk operations (admin only) - SECURITY: CSRF protection applied
router.post('/bulk/status', authenticateToken, requireRole('admin'), validateCSRF, bulkOperationLimiter, bulkUpdateStatus);

// Bulk import operations (admin only) - SECURITY: CSRF protection applied
router.post('/bulk/import', authenticateToken, requireRole('admin'), validateCSRF, upload.single('file'), bulkImportStaff);
router.post('/bulk/validate', authenticateToken, requireRole('admin'), validateCSRF, upload.single('file'), validateStaffBulkImportFile);
router.get('/bulk/template', authenticateToken, requireRole('admin'), getBulkImportTemplate);

export default router;

