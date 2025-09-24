import express from 'express';
import skOfficialsController from '../controllers/skOfficialsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

// Public routes (if any needed for SK Officials lookup)
// router.get('/public/search', skOfficialsController.publicSearch);

// === PUBLIC ROUTES ===
router.get('/statistics', skOfficialsController.getSKStatistics);

// Protected routes - require authentication
router.use(authenticateToken);

// === LIST & SEARCH ROUTES ===
router.get('/', (req, res, next) => {
  console.log('🚀 SK Officials route hit! Query params:', req.query);
  next();
}, skOfficialsController.getAllSKOfficials);
router.get('/search', skOfficialsController.searchSKOfficials);

// === INDIVIDUAL SK OFFICIAL ROUTES ===
router.get('/:id', skOfficialsController.getSKOfficialById);
router.post('/', requireRole(['admin', 'staff']), skOfficialsController.createSKOfficial);
router.put('/:id', requireRole(['admin', 'staff']), skOfficialsController.updateSKOfficial);
router.delete('/:id', requireRole(['admin']), skOfficialsController.deleteSKOfficial);

// === STATUS MANAGEMENT ===
router.patch('/:id/status', requireRole(['admin', 'staff']), skOfficialsController.updateSKStatus);
router.patch('/:id/activate', requireRole(['admin', 'staff']), skOfficialsController.activateSKOfficial);
router.patch('/:id/deactivate', requireRole(['admin', 'staff']), skOfficialsController.deactivateSKOfficial);

// === BULK OPERATIONS ===
router.post('/bulk/status', requireRole(['admin', 'staff']), skOfficialsController.bulkUpdateStatus);
router.post('/bulk/activate', requireRole(['admin', 'staff']), skOfficialsController.bulkActivate);
router.post('/bulk/deactivate', requireRole(['admin', 'staff']), skOfficialsController.bulkDeactivate);
router.delete('/bulk/delete', requireRole(['admin']), skOfficialsController.bulkDelete);

// === IMPORT/EXPORT ROUTES ===
router.post('/bulk/import', requireRole(['admin', 'staff']), upload.single('file'), skOfficialsController.bulkImportSKOfficials);
router.get('/export/csv', skOfficialsController.exportSKOfficialsCSV);
router.get('/export/pdf', skOfficialsController.exportSKOfficialsPDF);
router.get('/export/excel', skOfficialsController.exportSKOfficialsExcel);

// === TERM-SPECIFIC ROUTES ===
router.get('/by-term/:termId', skOfficialsController.getSKOfficialsByTerm);
router.get('/current-term/officials', skOfficialsController.getCurrentTermOfficials);

// === BARANGAY-SPECIFIC ROUTES ===
router.get('/by-barangay/:barangayId', skOfficialsController.getSKOfficialsByBarangay);
router.get('/barangay/:barangayId/positions', skOfficialsController.getBarangayPositions);

// === POSITION MANAGEMENT ===
router.get('/positions/available', skOfficialsController.getAvailablePositions);
router.get('/positions/conflicts', requireRole(['admin', 'staff']), skOfficialsController.getPositionConflicts);

// === PROFILE & CONTACT ROUTES ===
router.patch('/:id/profile', requireRole(['admin', 'staff']), skOfficialsController.updateSKProfile);
router.patch('/:id/contact', requireRole(['admin', 'staff']), skOfficialsController.updateSKContact);

// === AUDIT & HISTORY ROUTES ===
router.get('/:id/history', requireRole(['admin', 'staff']), skOfficialsController.getSKOfficialHistory);
router.get('/:id/activities', requireRole(['admin', 'staff']), skOfficialsController.getSKOfficialActivities);

export default router;
