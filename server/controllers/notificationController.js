import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as notificationService from '../services/notificationService.js';

/**
 * 🕹️ NotificationController: Express HTTP Handlers for In-App Notifications.
 * Obtains authenticated user ID exclusively from req.user._id.
 */

/**
 * Retrieves notifications for the logged-in user.
 * GET /api/v1/notifications?limit=20&tripId=...
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 20;
  const tripId = req.query.tripId || null;
  const notifications = await notificationService.getUserNotifications(req.user._id, limit, tripId);

  return res.status(200).json(
    new ApiResponse(200, { notifications }, 'User notifications retrieved successfully.')
  );
});

/**
 * Retrieves the unread notification count badge for the logged-in user.
 * GET /api/v1/notifications/unread-count?tripId=...
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const tripId = req.query.tripId || null;
  const unreadCount = await notificationService.getUnreadCount(req.user._id, tripId);

  return res.status(200).json(
    new ApiResponse(200, { unreadCount }, 'Unread notification count retrieved successfully.')
  );
});

/**
 * Marks a single notification as read for the logged-in user.
 * PATCH /api/v1/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);

  return res.status(200).json(
    new ApiResponse(200, { notification }, 'Notification marked as read.')
  );
});

/**
 * Marks all notifications as read for the logged-in user.
 * PATCH /api/v1/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);

  return res.status(200).json(
    new ApiResponse(200, result, 'All notifications marked as read.')
  );
});
