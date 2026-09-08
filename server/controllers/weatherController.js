import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {
  getWeatherForecast,
  analyzeWeatherForecast,
  analyzeWeatherForTrip,
  optimizeTripScheduleForWeather
} from '../services/weatherService.js';

/**
 * 🕹️ WeatherController: Express HTTP Request/Response Handler for OpenWeather Operations.
 * Fetches 5-day weather forecast data for a specified destination.
 * GET /api/v1/weather/forecast?destination=CityName
 */
export const getWeatherForecastController = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  const result = await getWeatherForecast(destination);

  return res.status(200).json(
    new ApiResponse(
      200,
      { weather: result },
      'Weather forecast fetched successfully.'
    )
  );
});

/**
 * Analyzes 5-day weather forecast data to detect adverse weather alerts for a destination.
 * GET /api/v1/weather/analyze?destination=CityName
 */
export const analyzeWeatherController = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  const weatherData = await getWeatherForecast(destination);
  const analysis = analyzeWeatherForecast(weatherData);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        weatherAnalysis: analysis
      },
      'Weather forecast analyzed successfully.'
    )
  );
});

/**
 * Analyzes weather forecast data mapped to a specific trip's calendar dates and activities.
 * GET /api/v1/weather/trip/:tripId/analyze
 */
export const analyzeWeatherForTripController = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const result = await analyzeWeatherForTrip(tripId);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        weatherAnalysis: result
      },
      'Trip weather forecast analyzed successfully.'
    )
  );
});

/**
 * Re-optimizes a trip's activity schedule for days with severe weather alerts using Gemini AI.
 * POST /api/v1/weather/trip/:tripId/optimize
 */
export const optimizeTripScheduleForWeatherController = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const result = await optimizeTripScheduleForWeather(tripId);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        optimizationResult: result
      },
      'Trip schedule re-optimized for weather successfully.'
    )
  );
});
