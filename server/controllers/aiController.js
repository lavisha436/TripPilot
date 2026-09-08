import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Trip } from '../models/Trip.js';
import * as aiService from '../services/aiService.js';
import * as tripService from '../services/tripService.js';
import * as activityService from '../services/activityService.js';
import * as expenseService from '../services/expenseService.js';
import * as galleryService from '../services/galleryService.js';

/**
 * 🕹️ AIController: Express HTTP Request/Response Handler for Gemini AI Operations.
 * Manages HTTP responses and delegates generative AI requests to aiService.
 */

/**
 * Recommends travel destinations based on budget, style, companion, and interest preferences.
 * POST /api/v1/ai/discover-destinations
 */
export const discoverDestinations = asyncHandler(async (req, res) => {
  const destinations = await aiService.discoverDestinations(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      { destinations },
      'AI destination recommendations generated successfully.'
    )
  );
});

/**
 * Generates an automated day-by-day itinerary schedule for a destination.
 * POST /api/v1/ai/generate-itinerary
 */
export const generateItinerary = asyncHandler(async (req, res) => {
  const result = await aiService.generateItinerary(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      { itinerary: result.dayWiseItinerary || result },
      'AI day-wise itinerary generated successfully.'
    )
  );
});

/**
 * Generates a dynamic packing checklist tailored to a trip destination and activities.
 * POST /api/v1/ai/generate-packing-list
 */
export const generatePackingList = asyncHandler(async (req, res) => {
  const packingList = await aiService.generatePackingList(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      { packingList },
      'AI packing checklist generated successfully.'
    )
  );
});

/**
 * Re-optimizes an existing schedule for unexpected bad weather alerts.
 * POST /api/v1/ai/optimize-weather
 */
export const optimizeScheduleForWeather = asyncHandler(async (req, res) => {
  const { currentActivities, weatherAlert } = req.body;

  const optimizedActivities = await aiService.optimizeScheduleForWeather(
    currentActivities,
    weatherAlert
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { optimizedActivities },
      'Itinerary schedule re-optimized for weather successfully.'
    )
  );
});

/**
 * Estimates baseline reserved budget breakdown (intercity transport, accommodation, buffer).
 * POST /api/v1/ai/estimate-budget
 */
export const generateBudgetEstimate = asyncHandler(async (req, res) => {
  const estimate = await aiService.generateBudgetEstimate(req.body);

  return res.status(200).json(
    new ApiResponse(
      200,
      { estimate },
      'AI budget estimate generated successfully.'
    )
  );
});

/**
 * Retrieves the saved After-the-Trip AI Travel Summary for a specified trip workspace.
 * GET /api/v1/ai/trips/:tripId/summary
 */
export const getTripSummary = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;

  const { trip } = await tripService.getTripById(tripId);

  if (trip.travelSummary) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { summary: trip.travelSummary, isGenerated: true },
        'Saved travel summary retrieved successfully.'
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { summary: null, isGenerated: false },
      'No saved travel summary found for this trip.'
    )
  );
});

/**
 * Generates and permanently saves an After-the-Trip AI Travel Summary for a specified trip workspace.
 * POST /api/v1/ai/trips/:tripId/summary
 */
export const generateTripSummary = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId || req.body.tripId;

  // Step A — Fetch trip
  const { trip } = await tripService.getTripById(tripId);

  // Step B — Check for an existing summary FIRST
  if (trip.travelSummary) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { summary: trip.travelSummary, isGenerated: true },
        'Saved travel summary retrieved successfully.'
      )
    );
  }

  // Step C — If no summary exists, fetch contextual trip data & call Gemini
  const activities = await activityService.getTripActivities(tripId);
  const expenses = await expenseService.getTripExpenses(tripId);
  const gallery = await galleryService.getTripGallery(tripId);

  const summary = await aiService.generateTripSummary({
    trip,
    activities,
    expenses,
    gallery
  });

  // Step D — Save the generated summary with race condition protection
  // Re-check current Trip document to ensure another concurrent request hasn't saved a summary in the meantime
  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: tripId, travelSummary: null },
    { $set: { travelSummary: summary } },
    { new: true }
  );

  // If another request set travelSummary first, use that existing summary instead of overwriting
  const finalSummary = updatedTrip
    ? updatedTrip.travelSummary
    : (await Trip.findById(tripId))?.travelSummary || summary;

  return res.status(200).json(
    new ApiResponse(
      200,
      { summary: finalSummary, isGenerated: true },
      'AI travel summary generated and saved successfully.'
    )
  );
});
