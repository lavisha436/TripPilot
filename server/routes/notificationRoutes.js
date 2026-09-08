import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ NotificationRoutes: Router module for In-App User Notifications.
 * Base Path: /api/v1/notifications
 */
const router = Router();

// ==========================================
// 🔒 All Notification Routes Require Authentication
// ==========================================
router.use(protect);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get notifications for authenticated user (newest first)
 * @access  Private
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get total unread notification count badge for authenticated user
 * @access  Private
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all unread notifications as read for authenticated user
 * @access  Private
 * ⚠️ Defined BEFORE /:id/read to prevent parameter matching conflict!
 */
router.patch('/read-all', markAllAsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark single notification as read by ID for authenticated user
 * @access  Private
 */
router.patch('/:id/read', markAsRead);

export default router;
