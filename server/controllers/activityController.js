import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as activityService from '../services/activityService.js';

/**
 * 🕹️ ActivityController: Express HTTP Request/Response Handler for Itinerary Activities.
 * Extracts HTTP parameters, passes data to activityService, and wraps responses in ApiResponse.
 */

/**
 * Creates a new itinerary activity under a trip workspace.
 * POST /api/v1/trips/:tripId/activities
 */
export const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(
    req.user._id,
    req.params.tripId,
    req.body
  );

  return res.status(201).json(
    new ApiResponse(201, { activity }, 'Activity created successfully.')
  );
});

/**
 * Retrieves all activities for a trip, optionally filtered by dayNumber.
 * GET /api/v1/trips/:tripId/activities?dayNumber=1
 */
export const getTripActivities = asyncHandler(async (req, res) => {
  const activities = await activityService.getTripActivities(
    req.params.tripId,
    req.query.dayNumber
  );

  return res.status(200).json(
    new ApiResponse(200, { activities }, 'Trip activities retrieved successfully.')
  );
});

/**
 * Retrieves details for a specific activity by ID within a trip workspace.
 * GET /api/v1/trips/:tripId/activities/:activityId
 */
export const getActivityById = asyncHandler(async (req, res) => {
  const activity = await activityService.getActivityById(
    req.params.tripId,
    req.params.activityId
  );

  return res.status(200).json(
    new ApiResponse(200, { activity }, 'Activity details retrieved successfully.')
  );
});

/**
 * Updates metadata or schedule info for an activity.
 * PUT /api/v1/trips/:tripId/activities/:activityId
 */
export const updateActivity = asyncHandler(async (req, res) => {
  const updatedActivity = await activityService.updateActivity(
    req.params.tripId,
    req.params.activityId,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(200, { activity: updatedActivity }, 'Activity updated successfully.')
  );
});

/**
 * Deletes an activity and re-indexes remaining items on that day.
 * DELETE /api/v1/trips/:tripId/activities/:activityId
 */
export const deleteActivity = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(req.params.tripId, req.params.activityId);

  return res.status(200).json(
    new ApiResponse(200, null, 'Activity deleted successfully.')
  );
});

/**
 * Re-orders activities across days or within the same day for drag-and-drop support.
 * PATCH /api/v1/trips/:tripId/activities/reorder
 */
export const reorderActivities = asyncHandler(async (req, res) => {
  const reorderPayload = Array.isArray(req.body) ? req.body : req.body.activities;

  const activities = await activityService.reorderActivities(
    req.params.tripId,
    reorderPayload
  );

  return res.status(200).json(
    new ApiResponse(200, { activities }, 'Activities reordered successfully.')
  );
});

/**
 * Toggles or explicitly updates the completion status of an activity.
 * PATCH /api/v1/trips/:tripId/activities/:activityId/toggle-complete
 */
export const toggleActivityCompletion = asyncHandler(async (req, res) => {
  const activity = await activityService.toggleActivityCompletion(
    req.params.tripId,
    req.params.activityId,
    req.body.isCompleted
  );

  return res.status(200).json(
    new ApiResponse(200, { activity }, 'Activity completion status updated successfully.')
  );
});
