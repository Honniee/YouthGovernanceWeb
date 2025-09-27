import express from 'express';
import { 
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user notifications (with pagination)
router.get('/', authenticateToken, getUserNotifications);

// Get unread count
router.get('/unread-count', authenticateToken, getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, markAllAsRead);

// Delete a notification
router.delete('/:notificationId', authenticateToken, deleteNotification);

export default router;




























