import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { getIO } from '../socket.js';

/**
 * 🔔 NotificationService: Manages creation, query retrieval, unread count tracking,
 * and read-status updates for in-app user notifications.
 */

/**
 * Creates a new in-app notification document for a target recipient user.
 * 
 * @param {Object} notificationData
 * @param {string} notificationData.recipientId - Target user ID (recipient).
 * @param {string} [notificationData.senderId=null] - User ID who triggered notification.
 * @param {string} [notificationData.tripId=null] - Related trip workspace ID.
 * @param {string} notificationData.type - Notification type ('WEATHER_ALERT', 'BUDGET_WARNING', etc.).
 * @param {string} notificationData.title - Concise notification header title.
 * @param {string} notificationData.message - Notification message body.
 * @param {string} [notificationData.actionUrl=''] - Client route to navigate to when clicked.
 * @returns {Promise<Object>} Created notification document.
 */
export const createNotification = async ({
  recipientId,
  senderId = null,
  tripId = null,
  type,
  title,
  message,
  actionUrl = ''
}) => {
  if (!recipientId) {
    throw new ApiError(400, 'Recipient user ID is required to create a notification.');
  }
  if (!type || !title || !message) {
    throw new ApiError(400, 'Notification type, title, and message are required.');
  }

  // 1. Primary Ground-Truth Database Creation
  const notification = await Notification.create({
    recipientId,
    senderId,
    tripId,
    type,
    title,
    message,
    actionUrl,
    isRead: false
  });

  // 2. Real-Time Socket.IO Notification Emission (Non-blocking side effect)
  try {
    const populatedNotification = await Notification.findById(notification._id)
      .populate('senderId', 'name email avatar')
      .populate('tripId', 'title destination');

    getIO()
      .to(`user:${recipientId}`)
      .emit('notification:new', populatedNotification || notification);
  } catch (socketErr) {
    console.error('[Socket.IO Emission Error - notification:new]:', socketErr.message);
  }

  return notification;
};

/**
 * Retrieves paginated notifications for the authenticated recipient user (newest first).
 * Strictly filtered by recipientId === userId. Optionally filtered by tripId when in workspace.
 * 
 * @param {string} userId - Authenticated recipient user ID.
 * @param {number} [limit=20] - Maximum records to return.
 * @param {string} [tripId=null] - Optional trip workspace ID for scoping.
 * @returns {Promise<Array>} List of notification documents populated with sender & trip metadata.
 */
export const getUserNotifications = async (userId, limit = 20, tripId = null) => {
  const parsedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  const query = { recipientId: userId };
  if (tripId && mongoose.Types.ObjectId.isValid(tripId)) {
    query.tripId = tripId;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .populate('senderId', 'name email avatar')
    .populate('tripId', 'title destination');

  return notifications;
};

/**
 * Counts unread notifications belonging exclusively to the authenticated user.
 * Strictly filtered by recipientId === userId AND isRead === false.
 * Optionally filtered by tripId when in trip workspace.
 * 
 * @param {string} userId - Authenticated user ID.
 * @param {string} [tripId=null] - Optional trip workspace ID for scoping.
 * @returns {Promise<number>} Number of unread notifications.
 */
export const getUnreadCount = async (userId, tripId = null) => {
  const query = {
    recipientId: userId,
    isRead: false
  };
  if (tripId && mongoose.Types.ObjectId.isValid(tripId)) {
    query.tripId = tripId;
  }

  const unreadCount = await Notification.countDocuments(query);

  return unreadCount;
};

/**
 * Marks a specific notification as read.
 * STRICT SECURITY REQUIREMENT: Query MUST match both _id AND recipientId === userId.
 * 
 * @param {string} userId - Authenticated user ID.
 * @param {string} notificationId - Target notification ID.
 * @returns {Promise<Object>} Updated notification document.
 */
export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true }
  )
    .populate('senderId', 'name email avatar')
    .populate('tripId', 'title destination');

  if (!notification) {
    throw new ApiError(404, 'Notification record not found or access denied.');
  }

  return notification;
};

/**
 * Marks all unread notifications as read for the authenticated user.
 * Strictly scopes update to recipientId === userId.
 * 
 * @param {string} userId - Authenticated user ID.
 * @returns {Promise<Object>} Summary of updated documents count.
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true }
  );

  return { modifiedCount: result.modifiedCount };
};
