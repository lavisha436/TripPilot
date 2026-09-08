import mongoose from 'mongoose';

/**
 * TripMember Schema managing multi-user collaboration, member roles,
 * invitation lifecycles, and permission audit trails.
 */
const tripMemberSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required.']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.']
    },
    role: {
      type: String,
      enum: {
        values: ['OWNER', 'EDITOR', 'VIEWER'],
        message: '{VALUE} is not a valid trip role.'
      },
      default: 'VIEWER'
    },
    inviteStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'DECLINED'],
        message: '{VALUE} is not a valid invitation status.'
      },
      default: 'PENDING'
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter user ID is required.']
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    inviteMessage: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound Unique Index: Prevents duplicate invitations for the same user on the same trip
tripMemberSchema.index({ tripId: 1, userId: 1 }, { unique: true });

// Secondary Index: Enables fast lookup of accepted trips for a user's dashboard
tripMemberSchema.index({ userId: 1, inviteStatus: 1 });

export const TripMember = mongoose.model('TripMember', tripMemberSchema);
