import { Router } from 'express';
import { uploadMedia, getGalleryMedia, deleteMedia } from '../controllers/galleryController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';
import { uploadSingleMedia } from '../middlewares/uploadMiddleware.js';

/**
 * 🛣️ GalleryRoutes: Express Router module for Trip Gallery Operations.
 * Base Path: /api/v1/trips/:tripId/gallery
 * Utilizes `mergeParams: true` so `:tripId` from parent router is available.
 */
const router = Router({ mergeParams: true });

// ==========================================
// 🔒 All Gallery Routes Require Authentication
// ==========================================
router.use(protect);

/**
 * @route   GET /api/v1/trips/:tripId/gallery
 * @desc    Get all gallery media items for a trip workspace (newest first)
 * @access  Private (OWNER, EDITOR, VIEWER accepted trip members)
 */
router.get(
  '/',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  getGalleryMedia
);

/**
 * @route   POST /api/v1/trips/:tripId/gallery
 * @desc    Upload image or video file to trip workspace gallery
 * @access  Private (OWNER, EDITOR, VIEWER accepted trip members)
 */
router.post(
  '/',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  uploadSingleMedia('file'),
  uploadMedia
);

/**
 * @route   DELETE /api/v1/trips/:tripId/gallery/:mediaId
 * @desc    Delete a gallery media item by mediaId
 * @access  Private (OWNER deletes any media; EDITOR/VIEWER deletes own media)
 */
router.delete(
  '/:mediaId',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  deleteMedia
);

export default router;
