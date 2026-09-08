import mongoose from 'mongoose';

/**
 * Settlement Schema representing an inter-member repayment record.
 * Tracks settlements paid from one trip member (debtor) to another (creditor).
 * Completely decoupled from Trip.budget.spent.
 */
const settlementSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip workspace ID is required.']
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Debtor (fromUser) ID is required.']
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creditor (toUser) ID is required.']
    },
    amount: {
      type: Number,
      required: [true, 'Settlement amount is required.'],
      min: [0.01, 'Settlement amount must be at least 0.01.']
    },
    settledDate: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User recording settlement is required.']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup of trip settlements and member balance adjustments
settlementSchema.index({ tripId: 1, settledDate: -1 });
settlementSchema.index({ tripId: 1, fromUser: 1, toUser: 1 });

export const Settlement = mongoose.model('Settlement', settlementSchema);
