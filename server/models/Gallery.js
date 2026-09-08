import mongoose from 'mongoose';

/**
 * Gallery Schema managing Cloudinary media uploads (photos and videos)
 * shared collaboratively by trip members.
 */
const gallerySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required.']
    },
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user ID is required.']
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required.']
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required.']
    },
    mediaType: {
      type: String,
      enum: {
        values: ['IMAGE', 'VIDEO'],
        message: '{VALUE} is not a valid media type.'
      },
      default: 'IMAGE'
    },
    caption: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound Index for reverse-chronological gallery pagination by trip
gallerySchema.index({ tripId: 1, createdAt: -1 });

export const Gallery = mongoose.model('Gallery', gallerySchema);
