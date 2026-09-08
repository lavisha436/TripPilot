import mongoose from 'mongoose';

/**
 * Trip Schema representing a travel project created by a user.
 * Stores core trip parameters, budgets, packing checklist, and preferences.
 */
const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Trip title is required.'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Destination is required.'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    startingLocation: {
      type: String,
      required: [true, 'Starting location is required.'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required.']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required.']
    },
    travelCompanion: {
      type: String,
      enum: {
        values: ['SOLO', 'FRIENDS', 'FAMILY', 'COUPLE', 'BUSINESS'],
        message: '{VALUE} is not a valid travel companion type.'
      },
      required: [true, 'Travel companion type is required.']
    },
    budgetType: {
      type: String,
      enum: {
        values: ['BUDGET', 'MID_RANGE', 'LUXURY'],
        message: '{VALUE} is not a valid budget type.'
      },
      required: [true, 'Budget type is required.']
    },
    transportationMode: {
      type: String,
      enum: ['FLIGHT', 'TRAIN', 'BUS', 'OWN_VEHICLE'],
      required: true
    },
    accommodationType: {
      type: String,
      enum: ['BUDGET', 'THREE_STAR', 'FOUR_STAR', 'FIVE_STAR'],
      required: true
    },
    travelerCount: {
      type: Number,
      default: 1,
      min: [1, 'Traveler count must be at least 1.']
    },
    interests: [
      {
        type: String,
        trim: true
      }
    ],
    budget: {
      estimated: {
        type: Number,
        required: [true, 'Estimated budget is required.'],
        min: [0, 'Estimated budget cannot be negative.']
      },
      reserved: {
        intercityTransport: {
          type: Number,
          default: 0,
          min: [0, 'Intercity transport cost cannot be negative.']
        },
        accommodation: {
          type: Number,
          default: 0,
          min: [0, 'Accommodation cost cannot be negative.']
        },
        buffer: {
          type: Number,
          default: 0,
          min: [0, 'Buffer amount cannot be negative.']
        },
        total: {
          type: Number,
          default: 0,
          min: [0, 'Reserved total cannot be negative.']
        }
      },
      itineraryBudget: {
        type: Number,
        default: 0,
        min: [0, 'Itinerary budget cannot be negative.']
      },
      spent: {
        type: Number,
        default: 0,
        min: [0, 'Spent amount cannot be negative.']
      },
      currency: {
        type: String,
        default: 'INR',
        uppercase: true,
        trim: true
      }
    },
    status: {
      type: String,
      enum: ['PLANNED', 'ONGOING', 'COMPLETED', 'ARCHIVED'],
      default: 'PLANNED'
    },
    coverImage: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    packingChecklist: [
      {
        item: {
          type: String,
          required: true,
          trim: true
        },
        category: {
          type: String,
          default: 'General',
          trim: true
        },
        packedBy: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        ]
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    activeItinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Itinerary',
      default: null
    },
    travelSummary: {
      type: {
        headline: { type: String, required: true },
        overview: { type: String, required: true },
        keyHighlights: [{ type: String }],
        financialRecap: { type: String, required: true },
        photoMemoriesCount: { type: Number, default: 0 },
        travelerPersona: { type: String, required: true },
        generatedAt: { type: Date, default: Date.now }
      },
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for fast queries by destination and status
tripSchema.index({ destination: 1, status: 1 });
// Index on createdBy to retrieve all trips created by a user quickly
tripSchema.index({ createdBy: 1 });

export const Trip = mongoose.model('Trip', tripSchema);
