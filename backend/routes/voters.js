import express from 'express';
import multer from 'multer';

// Import controllers
import voterController from '../controllers/voterController.js';

// Import middleware
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { apiLimiter, bulkOperationLimiter, exportLimiter } from '../middleware/rateLimiter.js';
import { validateCSRF } from '../middleware/csrf.js';

const router = express.Router();

// Configure multer for file uploads (bulk import)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// === EXPORT ROUTES ===
// NOTE: Export routes must come BEFORE parameterized routes to avoid conflicts

// Export voters
router.get('/export', 
  requireRole(['admin', 'lydo_staff']),
  exportLimiter,
  voterController.exportVoters
);

// === CORE CRUD ROUTES ===

// List and search voters
router.get('/', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  voterController.getVoters
);

// Get voter by ID
router.get('/:id', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  voterController.getVoterById
);

// Create new voter - SECURITY: CSRF protection applied
router.post('/', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  apiLimiter,
  voterController.createVoter
);

// Update voter - SECURITY: CSRF protection applied
router.put('/:id', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  apiLimiter,
  voterController.updateVoter
);

// Hard delete voter (permanent removal) - admin only - SECURITY: CSRF protection applied
// Must come before generic /:id route to avoid route conflicts
router.delete('/:id/hard-delete', 
  requireRole('admin'),
  validateCSRF,
  apiLimiter,
  voterController.hardDeleteVoter
);

// Restore archived voter - SECURITY: CSRF protection applied
router.patch('/:id/restore', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  apiLimiter,
  voterController.restoreVoter
);

// Soft delete voter (archive) - SECURITY: CSRF protection applied
router.delete('/:id', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  apiLimiter,
  voterController.deleteVoter
);

// === BULK OPERATIONS ROUTES ===
// NOTE: Bulk routes must come BEFORE parameterized routes to avoid conflicts
// SECURITY: CSRF protection applied to all bulk operations

// Bulk status update (archive/restore)
router.post('/bulk', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  bulkOperationLimiter,
  voterController.bulkUpdateStatus
);

// Bulk import
router.post('/bulk/import', 
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  bulkOperationLimiter,
  upload.single('file'),
  voterController.bulkImportVoters
);

// Bulk validation
router.post('/bulk/validate',
  requireRole(['admin', 'lydo_staff']),
  validateCSRF,
  bulkOperationLimiter,
  upload.single('file'),
  voterController.validateBulkImportFile
);

// Get bulk import template
router.get('/bulk/template', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  voterController.getBulkImportTemplate
);

export default router;

