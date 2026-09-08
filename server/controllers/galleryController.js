import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as galleryService from '../services/galleryService.js';

/**
 * 🕹️ GalleryController: Express HTTP Request Handlers for Trip Photo & Media Operations.
 */

/**
 * Uploads a single image or video file to a trip workspace gallery.
 * POST /api/v1/trips/:tripId/gallery
 */
export const uploadMedia = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { caption } = req.body;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, 'Please select an image or video file to upload.');
  }

  const media = await galleryService.uploadGalleryMedia({
    userId: req.user._id,
    tripId,
    file,
    caption
  });

  return res.status(201).json(
    new ApiResponse(201, { media }, 'Media uploaded to trip gallery successfully.')
  );
});

/**
 * Retrieves all gallery media items for a specific trip workspace.
 * GET /api/v1/trips/:tripId/gallery
 */
export const getGalleryMedia = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const gallery = await galleryService.getTripGallery(tripId);

  return res.status(200).json(
    new ApiResponse(200, { gallery }, 'Trip gallery media retrieved successfully.')
  );
});

/**
 * Deletes a single gallery media item for a specific trip workspace.
 * DELETE /api/v1/trips/:tripId/gallery/:mediaId
 */
export const deleteMedia = asyncHandler(async (req, res) => {
  const { tripId, mediaId } = req.params;
  const userRole = req.tripMember?.role;

  await galleryService.deleteGalleryMedia({
    userId: req.user._id,
    userRole,
    tripId,
    mediaId
  });

  return res.status(200).json(
    new ApiResponse(200, null, 'Gallery media deleted successfully.')
  );
});
