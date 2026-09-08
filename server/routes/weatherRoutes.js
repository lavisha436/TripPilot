import { Router } from 'express';
import {
  getWeatherForecastController,
  analyzeWeatherController,
  analyzeWeatherForTripController,
  optimizeTripScheduleForWeatherController
} from '../controllers/weatherController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ WeatherRoutes: Router module for OpenWeather Operations.
 * Base Path: /api/v1/weather
 */
const router = Router();

// ==========================================
// 🔒 All Weather Endpoints Require JWT Authentication
// ==========================================
router.use(protect);

/**
 * @route   GET /api/v1/weather/forecast
 * @desc    Fetches 5-day weather forecast data for a destination
 * @access  Private (Authenticated Users)
 */
router.get('/forecast', getWeatherForecastController);

/**
 * @route   GET /api/v1/weather/analyze
 * @desc    Fetches and analyzes forecast data for adverse weather conditions
 * @access  Private (Authenticated Users)
 */
router.get('/analyze', analyzeWeatherController);

/**
 * @route   GET /api/v1/weather/trip/:tripId/analyze
 * @desc    Analyzes weather forecast mapped to a trip's calendar dates & activities
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.get(
  '/trip/:tripId/analyze',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  analyzeWeatherForTripController
);

/**
 * @route   POST /api/v1/weather/trip/:tripId/optimize
 * @desc    Re-optimizes a trip schedule for severe weather days
 * @access  Private (Accepted OWNER, EDITOR)
 */
router.post(
  '/trip/:tripId/optimize',
  checkTripRole('OWNER', 'EDITOR'),
  optimizeTripScheduleForWeatherController
);

export default router;
