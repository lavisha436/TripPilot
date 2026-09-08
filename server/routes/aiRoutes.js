import { Router } from 'express';
import {
  discoverDestinations,
  generateItinerary,
  generatePackingList,
  optimizeScheduleForWeather,
  generateBudgetEstimate,
  getTripSummary,
  generateTripSummary
} from '../controllers/aiController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ AIRoutes: Router module for Google Gemini AI Operations.
 * Base Path: /api/v1/ai
 */
const router = Router();

// ==========================================
// 🔒 All AI Endpoints Require JWT Authentication
// ==========================================
router.use(protect);

/**
 * @route   POST /api/v1/ai/discover-destinations
 * @desc    Recommends travel destinations based on user preferences
 * @access  Private (Authenticated Users)
 */
router.post('/discover-destinations', discoverDestinations);

/**
 * @route   POST /api/v1/ai/generate-itinerary
 * @desc    Generates automated day-by-day travel itinerary schedule
 * @access  Private (Authenticated Users)
 */
router.post('/generate-itinerary', generateItinerary);

/**
 * @route   POST /api/v1/ai/generate-packing-list
 * @desc    Generates dynamic packing checklist for destination and trip style
 * @access  Private (Authenticated Users)
 */
router.post('/generate-packing-list', generatePackingList);

/**
 * @route   POST /api/v1/ai/optimize-weather
 * @desc    Re-optimizes schedule for bad weather alerts (outdoor -> indoor)
 * @access  Private (Authenticated Users)
 */
router.post('/optimize-weather', optimizeScheduleForWeather);

/**
 * @route   POST /api/v1/ai/estimate-budget
 * @desc    Estimates baseline reserved budget breakdown (intercity transport, lodging, buffer)
 * @access  Private (Authenticated Users)
 */
router.post('/estimate-budget', generateBudgetEstimate);

/**
 * @route   GET /api/v1/ai/trips/:tripId/summary
 * @desc    Retrieves the saved After-the-Trip AI Travel Summary for a trip workspace
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.get(
  '/trips/:tripId/summary',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  getTripSummary
);

/**
 * @route   POST /api/v1/ai/trips/:tripId/summary
 * @desc    Generates and permanently saves an After-the-Trip AI Travel Summary for a trip workspace
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.post(
  '/trips/:tripId/summary',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  generateTripSummary
);

export default router;
