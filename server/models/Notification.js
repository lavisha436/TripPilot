import mongoose from 'mongoose';

/**
 * Notification Schema managing transient in-app alerts, navigation actions,
 * unread counter badges, and automated 90-day TTL data purging.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user ID is required.']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null
    },
    type: {
      type: String,
      enum: {
        values: [
          'WEATHER_ALERT',
          'BUDGET_WARNING',
          'ACTIVITY_REMINDER',
          'MEMBER_INVITE',
          'MEMBER_ACCEPTED',
          'AI_ITINERARY',
          'GALLERY_UPLOAD',
          'SYSTEM'
        ],
        message: '{VALUE} is not a valid notification type.'
      },
      required: [true, 'Notification type is required.']
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true
    },
    actionUrl: {
      type: String,
      trim: true,
      default: '' // e.g. "/trips/123/expenses"
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for fast navbar unread counter and drawer lookup
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// TTL (Time-To-Live) Index: Automatically deletes notifications after 90 days (7,776,000 seconds)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const Notification = mongoose.model('Notification', notificationSchema);
