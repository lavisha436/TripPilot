import { Router } from 'express';
import {
  saveItineraryCandidate,
  listItineraryCandidates,
  getItineraryCandidateById,
  activateItineraryCandidate,
  deleteItineraryCandidate,
  compareItineraryCandidates,
  resetTripItineraries
} from '../controllers/itineraryController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ ItineraryRoutes: Router module for Itinerary Versioning & Candidate Operations.
 * Base Path: /api/v1/trips/:tripId/itineraries
 * Inherits parent route parameters (:tripId) via mergeParams: true.
 */
const router = Router({ mergeParams: true });

// ==========================================
// 🔒 All Itinerary Candidate Endpoints Require Authentication
// ==========================================
router.use(protect);

/**
 * @route   POST /api/v1/trips/:tripId/itineraries
 * @desc    Save a new itinerary candidate and its activities
 * @access  Private (Accepted OWNER, EDITOR)
 * 
 * @route   GET /api/v1/trips/:tripId/itineraries
 * @desc    List all saved itinerary candidates metadata for a trip
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.route('/')
  .post(checkTripRole('OWNER', 'EDITOR'), saveItineraryCandidate)
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), listItineraryCandidates);

/**
 * @route   POST /api/v1/trips/:tripId/itineraries/reset
 * @desc    Reset trip itinerary state (clears activeItinerary and deletes candidates/activities)
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.post(
  '/reset',
  checkTripRole('OWNER', 'EDITOR'),
  resetTripItineraries
);

/**
 * @route   GET /api/v1/trips/:tripId/itineraries/compare
 * @desc    Get side-by-side comparison data for exactly two itinerary candidates (?versionIds=id1,id2)
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * ⚠️ MUST BE DEFINED BEFORE /:itineraryId to prevent "compare" matching as a dynamic parameter!
 */
router.get(
  '/compare',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  compareItineraryCandidates
);

/**
 * @route   GET /api/v1/trips/:tripId/itineraries/:itineraryId
 * @desc    Get details and activities for a single itinerary candidate
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   DELETE /api/v1/trips/:tripId/itineraries/:itineraryId
 * @desc    Delete an unselected itinerary candidate and its activities
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.route('/:itineraryId')
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getItineraryCandidateById)
  .delete(checkTripRole('OWNER', 'EDITOR'), deleteItineraryCandidate);

/**
 * @route   PATCH /api/v1/trips/:tripId/itineraries/:itineraryId/activate
 * @desc    Atomically activate selected candidate and delete all unselected alternative candidates
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.patch(
  '/:itineraryId/activate',
  checkTripRole('OWNER', 'EDITOR'),
  activateItineraryCandidate
);

export default router;
