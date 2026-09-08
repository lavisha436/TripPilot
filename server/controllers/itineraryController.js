import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as itineraryService from '../services/itineraryService.js';

/**
 * 🕹️ ItineraryController: HTTP Handler for Itinerary Versioning & Candidate Operations.
 */

/**
 * Saves a new itinerary candidate (title, source, activities array).
 * POST /api/v1/trips/:tripId/itineraries
 */
export const saveItineraryCandidate = asyncHandler(async (req, res) => {
  const { itinerary, activities } = await itineraryService.saveItineraryCandidate(
    req.user._id,
    req.params.tripId,
    req.body
  );

  return res.status(201).json(
    new ApiResponse(201, { itinerary, activities }, 'Itinerary candidate saved successfully.')
  );
});

/**
 * Lists metadata for all itinerary candidates belonging to a trip.
 * GET /api/v1/trips/:tripId/itineraries
 */
export const listItineraryCandidates = asyncHandler(async (req, res) => {
  const itineraries = await itineraryService.listItineraryCandidates(req.params.tripId);

  return res.status(200).json(
    new ApiResponse(200, { itineraries }, 'Itinerary candidates retrieved successfully.')
  );
});

/**
 * Retrieves details and activities for a single specific itinerary candidate.
 * GET /api/v1/trips/:tripId/itineraries/:itineraryId
 */
export const getItineraryCandidateById = asyncHandler(async (req, res) => {
  const { itinerary, activities } = await itineraryService.getItineraryCandidateById(
    req.params.tripId,
    req.params.itineraryId
  );

  return res.status(200).json(
    new ApiResponse(200, { itinerary, activities }, 'Itinerary candidate retrieved successfully.')
  );
});

/**
 * Activates a selected itinerary candidate as the trip's final active itinerary.
 * Atomically deletes all unselected candidates and their activities.
 * PATCH /api/v1/trips/:tripId/itineraries/:itineraryId/activate
 */
export const activateItineraryCandidate = asyncHandler(async (req, res) => {
  const { itinerary, activities } = await itineraryService.activateItineraryCandidate(
    req.user._id,
    req.params.tripId,
    req.params.itineraryId
  );

  return res.status(200).json(
    new ApiResponse(200, { itinerary, activities }, 'Final itinerary selected successfully.')
  );
});

/**
 * Deletes an unselected candidate itinerary and its activities.
 * DELETE /api/v1/trips/:tripId/itineraries/:itineraryId
 */
export const deleteItineraryCandidate = asyncHandler(async (req, res) => {
  await itineraryService.deleteItineraryCandidate(
    req.params.tripId,
    req.params.itineraryId
  );

  return res.status(200).json(
    new ApiResponse(200, null, 'Itinerary candidate deleted successfully.')
  );
});

/**
 * Compares two itinerary candidates side-by-side.
 * GET /api/v1/trips/:tripId/itineraries/compare?versionIds=id1,id2
 */
export const compareItineraryCandidates = asyncHandler(async (req, res) => {
  const versionIds = req.query.versionIds || req.query.ids;
  const itineraries = await itineraryService.compareItineraryCandidates(
    req.params.tripId,
    versionIds
  );

  return res.status(200).json(
    new ApiResponse(200, { itineraries }, 'Itinerary comparison retrieved successfully.')
  );
});

/**
 * Resets trip itinerary state (clears activeItinerary and deletes candidates/activities).
 * POST /api/v1/trips/:tripId/itineraries/reset
 */
export const resetTripItineraries = asyncHandler(async (req, res) => {
  await itineraryService.resetTripItineraries(req.params.tripId);

  return res.status(200).json(
    new ApiResponse(200, null, 'Trip itinerary reset successfully.')
  );
});
