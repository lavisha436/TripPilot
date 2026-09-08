import mongoose from 'mongoose';

/**
 * Expense Schema managing financial transactions, Splitwise-style cost allocations,
 * category breakdowns, and receipt image metadata.
 */
const expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required.']
    },
    title: {
      type: String,
      required: [true, 'Expense title is required.'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required.'],
      min: [0, 'Amount cannot be negative.']
    },
    category: {
      type: String,
      enum: {
        values: ['HOTEL', 'FOOD', 'SHOPPING', 'TRANSPORT', 'ACTIVITIES', 'MISC'],
        message: '{VALUE} is not a valid expense category.'
      },
      default: 'MISC',
      required: true
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer user ID is required.']
    },
    splitDetails: {
      splitType: {
        type: String,
        enum: ['EQUAL', 'CUSTOM'],
        default: 'EQUAL'
      },
      splits: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          amount: {
            type: Number,
            min: [0, 'Split amount cannot be negative.']
          }
        }
      ]
    },
    expenseDate: {
      type: Date,
      default: Date.now
    },
    receipt: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for Recharts aggregation queries by trip and category
expenseSchema.index({ tripId: 1, category: 1 });

// Compound Index for payer lookup and debt calculations
expenseSchema.index({ tripId: 1, paidBy: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
