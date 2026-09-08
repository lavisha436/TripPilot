import mongoose from 'mongoose';

/**
 * Itinerary Schema representing a specific schedule version/candidate for a trip.
 */
const itinerarySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required.'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Itinerary title is required.'],
      trim: true
    },
    source: {
      type: String,
      enum: ['AI_GENERATED', 'MANUAL'],
      default: 'AI_GENERATED'
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

export const Itinerary = mongoose.model('Itinerary', itinerarySchema);
