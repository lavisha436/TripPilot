import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as tripService from '../services/tripService.js';

/**
 * 🕹️ TripController: Express HTTP Request/Response Handler for Trip Workspaces.
 * Manages HTTP status codes, request parameters, and delegates business logic to tripService.
 */

/**
 * Creates a new trip workspace and auto-assigns creator as OWNER.
 * POST /api/v1/trips
 */
export const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.user._id, req.body);

  return res.status(201).json(
    new ApiResponse(201, { trip }, 'Trip workspace created successfully.')
  );
});

/**
 * Retrieves all accessible trips for the authenticated user (created & invited).
 * GET /api/v1/trips?status=PLANNED
 */
export const getUserTrips = asyncHandler(async (req, res) => {
  const trips = await tripService.getUserTrips(req.user._id, req.query.status);

  return res.status(200).json(
    new ApiResponse(200, { trips }, 'User trips retrieved successfully.')
  );
});

/**
 * Retrieves detailed trip metadata and accepted collaborators list by trip ID.
 * GET /api/v1/trips/:id
 */
export const getTripById = asyncHandler(async (req, res) => {
  const { trip, members } = await tripService.getTripById(req.params.id);

  return res.status(200).json(
    new ApiResponse(200, { trip, members }, 'Trip workspace details retrieved successfully.')
  );
});

/**
 * Updates metadata for a trip workspace.
 * PUT /api/v1/trips/:id
 */
export const updateTrip = asyncHandler(async (req, res) => {
  const updatedTrip = await tripService.updateTrip(req.params.id, req.body);

  return res.status(200).json(
    new ApiResponse(200, { trip: updatedTrip }, 'Trip workspace updated successfully.')
  );
});

/**
 * Deletes a trip workspace and cascades member deletions.
 * DELETE /api/v1/trips/:id
 */
export const deleteTrip = asyncHandler(async (req, res) => {
  await tripService.deleteTrip(req.params.id);

  return res.status(200).json(
    new ApiResponse(200, null, 'Trip workspace deleted successfully.')
  );
});

/**
 * Toggles or updates packed state of an item in a trip's packing checklist.
 * PATCH /api/v1/trips/:id/packing/:itemId
 */
export const togglePackingItem = asyncHandler(async (req, res) => {
  const packingChecklist = await tripService.togglePackingItem(
    req.user._id,
    req.params.id,
    req.params.itemId,
    req.body.isPacked
  );

  return res.status(200).json(
    new ApiResponse(200, { packingChecklist }, 'Packing checklist item updated successfully.')
  );
});

/**
 * Invites a user to a trip workspace (assign EDITOR or VIEWER role).
 * POST /api/v1/trips/:tripId/members
 */
export const addTripMemberController = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const member = await tripService.addTripMember(req.user._id, tripId, req.body);

  return res.status(201).json(
    new ApiResponse(201, { member }, 'Trip invitation sent successfully.')
  );
});

/**
 * Retrieves all pending trip invitations for the authenticated user.
 * GET /api/v1/trips/invitations
 */
export const getUserInvitationsController = asyncHandler(async (req, res) => {
  const invitations = await tripService.getUserInvitations(req.user._id);

  return res.status(200).json(
    new ApiResponse(200, { invitations }, 'Pending trip invitations retrieved successfully.')
  );
});

/**
 * Accepts a pending trip invitation.
 * PATCH /api/v1/trips/members/:membershipId/accept
 */
export const acceptTripInvitationController = asyncHandler(async (req, res) => {
  const member = await tripService.acceptTripInvitation(req.params.membershipId, req.user._id);

  return res.status(200).json(
    new ApiResponse(200, { member }, 'Trip invitation accepted successfully.')
  );
});

/**
 * Declines a pending trip invitation.
 * PATCH /api/v1/trips/members/:membershipId/decline
 */
export const declineTripInvitationController = asyncHandler(async (req, res) => {
  const member = await tripService.declineTripInvitation(req.params.membershipId, req.user._id);

  return res.status(200).json(
    new ApiResponse(200, { member }, 'Trip invitation declined successfully.')
  );
});

/**
 * Removes a member from a trip workspace.
 * DELETE /api/v1/trips/:tripId/members/:memberId
 */
export const removeTripMemberController = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  await tripService.removeTripMember(req.user._id, tripId, req.params.memberId);

  return res.status(200).json(
    new ApiResponse(200, null, 'Trip member removed successfully.')
  );
});

/**
 * Updates a member's role in a trip workspace.
 * PATCH /api/v1/trips/:tripId/members/:memberId/role
 */
export const updateTripMemberRoleController = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.params.id;
  const member = await tripService.updateTripMemberRole(
    req.user._id,
    tripId,
    req.params.memberId,
    req.body.role
  );

  return res.status(200).json(
    new ApiResponse(200, { member }, 'Trip member role updated successfully.')
  );
});

