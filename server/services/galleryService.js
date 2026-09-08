import mongoose from 'mongoose';
import { Gallery } from '../models/Gallery.js';
import { Trip } from '../models/Trip.js';
import { TripMember } from '../models/TripMember.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { createNotification } from './notificationService.js';

/**
 * 🖼️ GalleryService: Core Business Logic for Collaborative Trip Media Uploads & Storage.
 */

/**
 * Uploads a media file buffer to Cloudinary, creates a Gallery MongoDB document,
 * and notifies other accepted trip workspace members.
 * 
 * @param {Object} payload
 * @param {string} payload.userId - ID of the uploader.
 * @param {string} payload.tripId - Target trip workspace ID.
 * @param {Object} payload.file - Multer buffered file object (req.file).
 * @param {string} [payload.caption=''] - Optional text caption.
 * @returns {Promise<Object>} Created gallery media document populated with uploader info.
 */
export const uploadGalleryMedia = async ({ userId, tripId, file, caption }) => {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    throw new ApiError(400, 'Invalid trip ID format.');
  }
  if (!file || !file.buffer) {
    throw new ApiError(400, 'Please select an image or video file to upload.');
  }

  // 1. Verify target trip workspace exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // 2. Determine mediaType and resourceType ('IMAGE' vs 'VIDEO')
  const isVideo = file.mimetype.startsWith('video/');
  const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
  const resourceType = isVideo ? 'video' : 'image';

  // 3. Upload file buffer to Cloudinary in folder `trippilot/gallery/<tripId>`
  const folderPath = `trippilot/gallery/${tripId}`;
  const cloudinaryResult = await uploadToCloudinary(file.buffer, folderPath, resourceType);

  // 4. Save Gallery document to MongoDB
  let galleryDoc;
  try {
    galleryDoc = await Gallery.create({
      tripId,
      uploaderId: userId,
      mediaUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      mediaType,
      caption: caption ? caption.trim() : ''
    });
  } catch (dbError) {
    // Clean up uploaded Cloudinary asset if MongoDB save fails so orphaned assets are not left behind
    await deleteFromCloudinary(cloudinaryResult.public_id, resourceType);
    throw new ApiError(500, `Failed to save gallery record: ${dbError.message}`);
  }

  // 5. Populate uploader details
  const populatedMedia = await Gallery.findById(galleryDoc._id)
    .populate('uploaderId', 'name email avatar')
    .populate('tripId', 'title destination');

  // 6. Notify OTHER accepted members of the trip workspace (excluding uploader)
  try {
    const uploaderUser = populatedMedia.uploaderId;
    const uploaderName = uploaderUser?.name || uploaderUser?.email || 'A member';
    const tripTitle = populatedMedia.tripId?.title || trip.title || 'trip';

    const acceptedMembers = await TripMember.find({ tripId, inviteStatus: 'ACCEPTED' });
    const recipientUserIds = new Set();

    if (trip.createdBy) {
      recipientUserIds.add(trip.createdBy.toString());
    }
    acceptedMembers.forEach((m) => {
      if (m.userId) {
        recipientUserIds.add(m.userId.toString());
      }
    });

    // STRICT RECIPIENT RULE: Exclude the uploader from receiving their own notification
    recipientUserIds.delete(userId.toString());

    for (const recipientId of recipientUserIds) {
      await createNotification({
        recipientId,
        senderId: userId,
        tripId: trip._id,
        type: 'GALLERY_UPLOAD',
        title: '📸 New Trip Photo',
        message: `${uploaderName} uploaded new media to "${tripTitle}".`,
        actionUrl: `/dashboard/trip/${trip._id}/gallery`
      });
    }
  } catch (notifErr) {
    // Non-blocking side effect: log error without failing successful media upload
    console.error('[Notification Error - GALLERY_UPLOAD]:', notifErr.message);
  }

  return populatedMedia;
};

/**
 * Retrieves all gallery media items for a specified trip workspace (newest first).
 * 
 * @param {string} tripId - Target trip workspace ID.
 * @returns {Promise<Array>} List of gallery documents populated with uploader & trip details.
 */
export const getTripGallery = async (tripId) => {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    throw new ApiError(400, 'Invalid trip ID format.');
  }

  // Verify target trip workspace exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const gallery = await Gallery.find({ tripId })
    .sort({ createdAt: -1 })
    .populate('uploaderId', 'name email avatar')
    .populate('tripId', 'title destination');

  return gallery;
};

/**
 * Deletes a gallery media item by mediaId and tripId after verifying RBAC permissions
 * and cleaning up the asset from Cloudinary and document from MongoDB.
 * 
 * @param {Object} payload
 * @param {string} payload.userId - ID of the user requesting deletion.
 * @param {string} payload.userRole - Trip role of the user ('OWNER', 'EDITOR', 'VIEWER').
 * @param {string} payload.tripId - Target trip workspace ID.
 * @param {string} payload.mediaId - ID of the gallery media document to delete.
 * @returns {Promise<Object>} Summary of deleted media item.
 */
export const deleteGalleryMedia = async ({ userId, userRole, tripId, mediaId }) => {
  if (!mongoose.Types.ObjectId.isValid(tripId) || !mongoose.Types.ObjectId.isValid(mediaId)) {
    throw new ApiError(400, 'Invalid trip ID or media ID format.');
  }

  // 1. Verify media document exists and belongs to the specified trip
  const galleryItem = await Gallery.findOne({ _id: mediaId, tripId });
  if (!galleryItem) {
    throw new ApiError(404, 'Gallery media item not found.');
  }

  // 2. Enforce delete permissions: OWNER can delete any media; EDITOR/VIEWER can delete only their own uploaded media
  const isUploader = galleryItem.uploaderId.toString() === userId.toString();
  const isOwner = userRole === 'OWNER';

  if (!isOwner && !isUploader) {
    throw new ApiError(403, 'You are only authorized to delete media uploaded by yourself.');
  }

  // 3. Delete corresponding Cloudinary asset
  const resourceType = galleryItem.mediaType === 'VIDEO' ? 'video' : 'image';
  if (galleryItem.publicId) {
    await deleteFromCloudinary(galleryItem.publicId, resourceType);
  }

  // 4. Delete Gallery document from MongoDB
  await Gallery.findByIdAndDelete(mediaId);

  return { mediaId, tripId };
};
