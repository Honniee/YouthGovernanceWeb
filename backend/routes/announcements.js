import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStatistics,
  bulkUpdateAnnouncementStatus,
  uploadAnnouncementImage
} from '../controllers/announcementsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ---------------- File Upload Configuration ----------------
const uploadsBase = process.env.UPLOADS_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'uploads');
const announcementsDir = path.join(uploadsBase, 'announcements');
try { fs.mkdirSync(announcementsDir, { recursive: true }); } catch {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10) }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp')
      .split(',').map(s => s.trim().toLowerCase());
    const ext = (file.mimetype.split('/')[1] || '').toLowerCase();
    if (file.mimetype.startsWith('image/') && allowed.includes(ext)) return cb(null, true);
    cb(new Error('Invalid file type'));
  }
});

// Apply rate limiting to all routes
router.use(apiLimiter);

// Public routes (no authentication required)
router.get('/', getAllAnnouncements); // Public announcements
router.get('/:id', getAnnouncementById); // Public announcement details

// Protected routes (authentication required)
router.use(authenticateToken);

// Admin/Staff routes
router.post('/', upload.single('image'), createAnnouncement);

router.put('/:id', updateAnnouncement);
router.put('/:id/image', upload.single('image'), uploadAnnouncementImage);
router.delete('/:id', deleteAnnouncement);

// Statistics route (admin only)
router.get('/admin/statistics', getAnnouncementStatistics);

// Bulk operations
router.patch('/bulk/status', bulkUpdateAnnouncementStatus);

// Error handling middleware for file uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use the correct field name.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  }
  
  if (error.message === 'Invalid file type') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Please upload JPG, PNG, or WEBP images only.'
    });
  }
  
  next(error);
});

export default router;
