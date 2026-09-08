import { Router } from 'express';
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  togglePackingItem,
  addTripMemberController,
  getUserInvitationsController,
  acceptTripInvitationController,
  declineTripInvitationController,
  removeTripMemberController,
  updateTripMemberRoleController
} from '../controllers/tripController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ TripRoutes: Router module for Trip Workspaces & Collaboration.
 * Base Path: /api/v1/trips
 */
const router = Router();

// ==========================================
// 🔒 All Trip Routes Require JWT Authentication
// ==========================================
router.use(protect);

/**
 * @route   POST /api/v1/trips
 * @desc    Create a new trip workspace & auto-assign creator as OWNER
 * @access  Private (Authenticated Users)
 * 
 * @route   GET /api/v1/trips
 * @desc    Retrieve all accessible trips for authenticated user (created & invited)
 * @access  Private (Authenticated Users)
 */
router.route('/')
  .post(createTrip)
  .get(getUserTrips);

/**
 * @route   GET /api/v1/trips/invitations
 * @desc    Retrieve all pending trip invitations for authenticated user
 * @access  Private (Authenticated Users)
 */
router.get('/invitations', getUserInvitationsController);

/**
 * @route   PATCH /api/v1/trips/members/:membershipId/accept
 * @desc    Accept a pending trip invitation
 * @access  Private (Invited User Only)
 * 
 * @route   PATCH /api/v1/trips/members/:membershipId/decline
 * @desc    Decline a pending trip invitation
 * @access  Private (Invited User Only)
 */
router.patch('/members/:membershipId/accept', acceptTripInvitationController);
router.patch('/members/:membershipId/decline', declineTripInvitationController);

/**
 * @route   POST /api/v1/trips/:tripId/members
 * @desc    Invite a user to a trip workspace (assign EDITOR or VIEWER role)
 * @access  Private (Accepted OWNER only)
 * 
 * @route   DELETE /api/v1/trips/:tripId/members/:memberId
 * @desc    Remove a member from a trip workspace
 * @access  Private (Accepted OWNER only)
 * 
 * @route   PATCH /api/v1/trips/:tripId/members/:memberId/role
 * @desc    Update a member's role in a trip workspace
 * @access  Private (Accepted OWNER only)
 */
router.post(
  '/:tripId/members',
  checkTripRole('OWNER'),
  addTripMemberController
);

router.delete(
  '/:tripId/members/:memberId',
  checkTripRole('OWNER'),
  removeTripMemberController
);

router.patch(
  '/:tripId/members/:memberId/role',
  checkTripRole('OWNER'),
  updateTripMemberRoleController
);

/**
 * @route   GET /api/v1/trips/:id
 * @desc    Get trip details & accepted collaborators list by ID
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   PUT /api/v1/trips/:id
 * @desc    Update trip workspace details (title, dates, budget)
 * @access  Private (Accepted OWNER, EDITOR)
 * 
 * @route   DELETE /api/v1/trips/:id
 * @desc    Delete trip workspace & cascade delete member records
 * @access  Private (Accepted OWNER only)
 */
router.route('/:id')
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getTripById)
  .put(checkTripRole('OWNER', 'EDITOR'), updateTrip)
  .delete(checkTripRole('OWNER'), deleteTrip);

/**
 * @route   PATCH /api/v1/trips/:id/packing/:itemId
 * @desc    Toggle or update packed state of an item in packing checklist for authenticated user
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.patch('/:id/packing/:itemId', checkTripRole('OWNER', 'EDITOR', 'VIEWER'), togglePackingItem);

export default router;
