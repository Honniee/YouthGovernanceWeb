import express from 'express';
import { 
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCSRF } from '../middleware/csrf.js';

const router = express.Router();

// Get user notifications (with pagination)
router.get('/', authenticateToken, getUserNotifications);

// Get unread count
router.get('/unread-count', authenticateToken, getUnreadCount);

// Mark notification as read - SECURITY: CSRF protection applied
router.patch('/:notificationId/read', authenticateToken, validateCSRF, markAsRead);

// Mark all notifications as read - SECURITY: CSRF protection applied
router.patch('/mark-all-read', authenticateToken, validateCSRF, markAllAsRead);

// Delete a notification - SECURITY: CSRF protection applied
router.delete('/:notificationId', authenticateToken, validateCSRF, deleteNotification);

export default router;




























