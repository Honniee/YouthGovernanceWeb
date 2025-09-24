import express from 'express';
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStatistics,
  bulkUpdateAnnouncementStatus
} from '../controllers/announcementsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Public routes (no authentication required)
router.get('/', getAllAnnouncements); // Public announcements
router.get('/:id', getAnnouncementById); // Public announcement details

// Protected routes (authentication required)
router.use(authenticateToken);

// Admin/Staff routes
router.post('/', createAnnouncement);

router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

// Statistics route (admin only)
router.get('/admin/statistics', getAnnouncementStatistics);

// Bulk operations
router.patch('/bulk/status', bulkUpdateAnnouncementStatus);

export default router;
