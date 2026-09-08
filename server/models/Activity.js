import mongoose from 'mongoose';

/**
 * Activity Schema representing a day-wise itinerary schedule item
 * with geolocation support, drag-and-drop order indexes, and completion states.
 */
const activitySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required.']
    },
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Itinerary',
      required: [true, 'Itinerary ID is required.'],
      index: true
    },
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required.'],
      min: [1, 'Day number must be at least 1.']
    },
    order: {
      type: Number,
      default: 0
    },
    time: {
      type: String,
      trim: true,
      default: '' // e.g. "09:30" in HH:mm 24-hr format
    },
    title: {
      type: String,
      required: [true, 'Activity title is required.'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      name: {
        type: String,
        default: '',
        trim: true
      },
      address: {
        type: String,
        default: '',
        trim: true
      },
      coordinates: {
        lat: {
          type: Number,
          default: null
        },
        lng: {
          type: Number,
          default: null
        }
      }
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: [0, 'Cost cannot be negative.']
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative.']
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    isWeatherOptimized: {
      type: Boolean,
      default: false
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

// Compound Index: Optimizes fetching ordered itinerary lists by trip, itinerary, and day
activitySchema.index({ tripId: 1, itineraryId: 1, dayNumber: 1, order: 1 });

export const Activity = mongoose.model('Activity', activitySchema);
