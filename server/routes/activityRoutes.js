import { Router } from 'express';
import {
  createActivity,
  getTripActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  reorderActivities,
  toggleActivityCompletion
} from '../controllers/activityController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ ActivityRoutes: Router module for Itinerary & Activity Operations.
 * Base Path: /api/v1/trips/:tripId/activities
 * Uses mergeParams: true to inherit parent route parameters (:tripId).
 */
const router = Router({ mergeParams: true });

// ==========================================
// 🔒 All Activity Routes Require Authentication
// ==========================================
router.use(protect);

/**
 * @route   POST /api/v1/trips/:tripId/activities
 * @desc    Create a new itinerary activity in a trip schedule
 * @access  Private (Accepted OWNER, EDITOR)
 * 
 * @route   GET /api/v1/trips/:tripId/activities
 * @desc    Get all activities for a trip (optional query ?dayNumber=N)
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.route('/')
  .post(checkTripRole('OWNER', 'EDITOR'), createActivity)
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getTripActivities);

/**
 * @route   PATCH /api/v1/trips/:tripId/activities/reorder
 * @desc    Re-order activities across days or within the same day
 * @access  Private (Accepted OWNER, EDITOR)
 * ⚠️ Defined BEFORE /:activityId to prevent route conflict matching!
 */
router.patch(
  '/reorder',
  checkTripRole('OWNER', 'EDITOR'),
  reorderActivities
);

/**
 * @route   GET /api/v1/trips/:tripId/activities/:activityId
 * @desc    Get specific activity details by ID
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   PUT /api/v1/trips/:tripId/activities/:activityId
 * @desc    Update activity details (title, time, location, duration, cost)
 * @access  Private (Accepted OWNER, EDITOR)
 * 
 * @route   DELETE /api/v1/trips/:tripId/activities/:activityId
 * @desc    Delete an activity and re-index remaining day items
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.route('/:activityId')
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getActivityById)
  .put(checkTripRole('OWNER', 'EDITOR'), updateActivity)
  .delete(checkTripRole('OWNER', 'EDITOR'), deleteActivity);

/**
 * @route   PATCH /api/v1/trips/:tripId/activities/:activityId/toggle-complete
 * @desc    Toggle or update completion status of an activity
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.patch(
  '/:activityId/toggle-complete',
  checkTripRole('OWNER', 'EDITOR'),
  toggleActivityCompletion
);

export default router;
