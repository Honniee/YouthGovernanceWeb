import express from 'express';
import multer from 'multer';

// Import controllers following the new architecture
import skOfficialsController from '../controllers/skOfficialsController.js';
import skBulkController from '../controllers/skBulkController.js';
import skReportsController from '../controllers/skReportsController.js';

// Import middleware
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
// Validation handled within controllers
import { apiLimiter, bulkOperationLimiter, exportLimiter } from '../middleware/rateLimiter.js';
// Security headers handled by server.js middleware

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

// === CORE CRUD ROUTES (skOfficialsController) ===

// List and search
router.get('/', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getAllSKOfficials
);

router.get('/search', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.searchSKOfficials
);

router.get('/statistics', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getSKStatistics
);

// === VACANCY MANAGEMENT ROUTES ===

router.get('/vacancies/barangay/:barangayId', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getBarangayVacancies
);

router.get('/vacancies/all', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getAllBarangayVacancies
);

router.get('/vacancies/overall', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getOverallVacancyStats
);

router.post('/validate-position',
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.validatePosition
);

// === BULK OPERATIONS ROUTES (skBulkController) ===
// NOTE: Bulk routes must come BEFORE parameterized routes to avoid conflicts

// Bulk import
router.post('/bulk/import', 
  requireRole(['admin', 'lydo_staff']),
  bulkOperationLimiter,
  upload.single('file'),
  skBulkController.bulkImportSKOfficials
);

// Bulk validation (new)
router.post('/bulk/validate', 
  requireRole(['admin', 'lydo_staff']),
  bulkOperationLimiter,
  upload.single('file'),
  skBulkController.validateBulkImport
);

router.post('/bulk/validate-data', 
  requireRole(['admin', 'lydo_staff']),
  bulkOperationLimiter,
  skBulkController.validateBulkData
);

router.get('/bulk/template', 
  requireRole(['admin', 'lydo_staff']),
  exportLimiter,
  skBulkController.getBulkImportTemplate
);

// Bulk status operations
router.put('/bulk/status', 
  requireRole(['admin', 'lydo_staff']),
  bulkOperationLimiter,
  skBulkController.bulkUpdateStatus
);

// === REPORTS & ANALYTICS ROUTES (skReportsController) ===

// Export operations
router.get('/export/csv', 
  requireRole(['admin', 'lydo_staff']),
  exportLimiter,
  skReportsController.exportSKOfficialsCSV
);

router.get('/export/pdf', 
  requireRole(['admin', 'lydo_staff']),
  exportLimiter,
  skReportsController.exportSKOfficialsPDF
);

router.get('/export/excel', 
  requireRole(['admin', 'lydo_staff']),
  exportLimiter,
  skReportsController.exportSKOfficialsExcel
);

// === INDIVIDUAL OPERATIONS (skOfficialsController) ===
// NOTE: Parameterized routes must come AFTER specific routes

router.get('/:id', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.getSKOfficialById
);

router.post('/', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.createSKOfficial
);

router.put('/:id', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.updateSKOfficial
);

router.delete('/:id', 
  requireRole('admin'), // Only admins can delete
  apiLimiter,
  skOfficialsController.deleteSKOfficial
);

// Status management
router.put('/:id/status', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skOfficialsController.updateSKStatus
);

// Analytics and reports
router.get('/reports/by-term', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getSKOfficialsByTerm
);

router.get('/reports/current-term', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getCurrentTermOfficials
);

router.get('/reports/by-barangay', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getSKOfficialsByBarangay
);

router.get('/reports/barangay-positions', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getBarangayPositions
);

router.get('/reports/available-positions', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getAvailablePositions
);

router.get('/reports/history/:id', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getSKOfficialHistory
);

router.get('/reports/activities', 
  requireRole(['admin', 'lydo_staff']),
  apiLimiter,
  skReportsController.getSKOfficialActivities
);

// Error handling middleware for file uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message === 'Invalid file type. Only CSV and Excel files are allowed.') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

export default router;
