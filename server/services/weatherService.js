import { ENV } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { Trip } from '../models/Trip.js';
import { TripMember } from '../models/TripMember.js';
import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { updateActivity } from './activityService.js';
import { optimizeScheduleForWeather } from './aiService.js';
import { createNotification } from './notificationService.js';

/**
 * Helper to validate that OPENWEATHER_API_KEY is configured in server environment.
 */
const getOpenWeatherApiKey = () => {
  if (!ENV.OPENWEATHER_API_KEY) {
    throw new ApiError(
      500,
      'OpenWeather API key is unconfigured. Please set OPENWEATHER_API_KEY in server environment.'
    );
  }
  return ENV.OPENWEATHER_API_KEY;
};

/**
 * Fetches 5-day weather forecast data for a given destination from OpenWeather API.
 * 
 * @param {string} destination - City or destination name to query.
 * @returns {Promise<Object>} Unformatted OpenWeather API forecast JSON object.
 */
export const getWeatherForecast = async (destination) => {
  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    throw new ApiError(400, 'Destination is required for weather forecast.');
  }

  const apiKey = getOpenWeatherApiKey();
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
    destination.trim()
  )}&appid=${apiKey}&units=metric`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ApiError(
      502,
      'Weather service request failed. Unable to connect to OpenWeather API.'
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError(
        502,
        `Weather service error: Destination "${destination}" not found.`
      );
    }

    throw new ApiError(
      502,
      'Weather service request failed. Upstream OpenWeather API error.'
    );
  }

  const data = await response.json();
  return data;
};

/**
 * Analyzes raw OpenWeather forecast data to detect adverse weather conditions (Rain, Thunderstorm, Snow, High Winds).
 * Generates a structured weather alert payload suitable for schedule re-optimization.
 * 
 * @param {Object} weatherData - Raw OpenWeather API forecast response.
 * @returns {Object} Structured analysis containing hasSevereWeather flag, weatherAlert summary, and matching conditions.
 */
export const analyzeWeatherForecast = (weatherData) => {
  if (!weatherData || !Array.isArray(weatherData.list)) {
    return {
      hasSevereWeather: false,
      weatherAlert: null,
      conditions: []
    };
  }

  const conditions = [];
  const detectedTypes = new Set();

  for (const entry of weatherData.list) {
    const mainCondition = entry?.weather?.[0]?.main || '';
    const description = entry?.weather?.[0]?.description || '';
    const pop = typeof entry?.pop === 'number' ? entry.pop : 0;
    const windSpeed = entry?.wind?.speed ?? 0;
    const rainVolume = entry?.rain ? (entry.rain['3h'] || entry.rain['1h'] || 0) : 0;

    const isHeavyOrShowerRain = /heavy|extreme|intense|shower|torrential/i.test(description);
    const isRain =
      (mainCondition === 'Rain' || mainCondition === 'Drizzle' || rainVolume > 0) &&
      (isHeavyOrShowerRain || pop >= 0.50 || rainVolume >= 1.0);

    const isThunderstorm = mainCondition === 'Thunderstorm';
    const isSnow = mainCondition === 'Snow';
    const isHighWind = windSpeed > 10.0 || mainCondition === 'Squall' || mainCondition === 'Tornado';

    if (isRain || isThunderstorm || isSnow || isHighWind) {
      let matchedCondition = mainCondition;
      if (isThunderstorm) {
        matchedCondition = 'Thunderstorm';
        detectedTypes.add('Thunderstorm');
      } else if (isSnow) {
        matchedCondition = 'Snow';
        detectedTypes.add('Snow');
      } else if (isRain) {
        matchedCondition = 'Rain';
        detectedTypes.add('Rain');
      } else if (isHighWind) {
        matchedCondition = 'High Wind';
        detectedTypes.add('High Wind');
      }

      conditions.push({
        time: entry?.dt_txt || '',
        condition: matchedCondition,
        description: description || matchedCondition.toLowerCase(),
        rainProbability: pop
      });
    }
  }

  if (conditions.length === 0) {
    return {
      hasSevereWeather: false,
      weatherAlert: null,
      conditions: []
    };
  }

  const typesList = Array.from(detectedTypes).join(' and ');
  const weatherAlert = `${typesList} expected during the forecast period. Outdoor activities may need to be replaced with indoor alternatives.`;

  return {
    hasSevereWeather: true,
    weatherAlert,
    conditions
  };
};

/**
 * Groups consecutive adverse forecast entries for the same day with matching condition & description.
 * Formats time range (e.g., "09:00–18:00" or "around 09:00").
 * 
 * @param {Array<Object>} rawConditions - List of raw adverse weather entries for a single day.
 * @returns {Array<Object>} Grouped weather conditions with time ranges.
 */
export const groupConsecutiveConditions = (rawConditions) => {
  if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
    return [];
  }

  const THREE_AND_HALF_HOURS_MS = 3.5 * 3600 * 1000;
  const grouped = [];
  let currentGroup = null;

  for (const item of rawConditions) {
    const timeStr = item.time ? item.time.split(' ')[1]?.slice(0, 5) || '' : '';
    const itemMs = item.time ? new Date(item.time.replace(' ', 'T')).getTime() : 0;
    const key = `${item.condition}||${(item.description || '').toLowerCase().trim()}`;

    const isConsecutive =
      currentGroup &&
      currentGroup.key === key &&
      currentGroup.lastMs > 0 &&
      itemMs > 0 &&
      itemMs - currentGroup.lastMs <= THREE_AND_HALF_HOURS_MS;

    if (isConsecutive) {
      currentGroup.endTime = timeStr;
      currentGroup.lastMs = itemMs;
      currentGroup.maxPop = Math.max(currentGroup.maxPop, item.rainProbability || 0);
      currentGroup.count += 1;
    } else {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = {
        key,
        condition: item.condition,
        rawDescription: item.description || item.condition.toLowerCase(),
        startTime: timeStr,
        endTime: timeStr,
        lastMs: itemMs,
        maxPop: item.rainProbability || 0,
        count: 1
      };
    }
  }

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped.map((g) => {
    const isRange = g.count > 1 && g.startTime && g.endTime && g.startTime !== g.endTime;
    const timeRangeStr = isRange ? `${g.startTime}–${g.endTime}` : g.startTime;
    const capDesc = g.rawDescription
      ? g.rawDescription.charAt(0).toUpperCase() + g.rawDescription.slice(1)
      : g.condition;

    const rangePhrase = isRange ? `from ${timeRangeStr}` : `around ${g.startTime}`;
    const summaryText = `${capDesc} expected ${rangePhrase}`;
    const formattedDescription = `${g.rawDescription} expected ${rangePhrase}`;

    return {
      condition: g.condition,
      description: formattedDescription,
      rawDescription: g.rawDescription,
      startTime: g.startTime,
      endTime: g.endTime,
      timeRange: timeRangeStr,
      summaryText,
      rainProbability: g.maxPop
    };
  });
};

/**
 * Helper to parse "HH:mm" time string into minutes from midnight (0 to 1440).
 * Returns null if invalid or unparseable.
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * Checks whether an activity interval [actStart, actEnd] overlaps with ANY severe weather interval in weatherConditions.
 * Overlap condition: (actStart < wEnd) && (actEnd > wStart)
 */
export const isActivityOverlappingSevereWeather = (activity, weatherConditions) => {
  if (!activity || !Array.isArray(weatherConditions) || weatherConditions.length === 0) {
    return false;
  }

  const actStart = parseTimeToMinutes(activity.time);
  if (actStart === null) return false; // Missing/invalid time -> not eligible for weather optimization

  const duration =
    typeof activity.estimatedDurationMinutes === 'number' && activity.estimatedDurationMinutes > 0
      ? activity.estimatedDurationMinutes
      : 60;

  const actEnd = actStart + duration;

  return weatherConditions.some((cond) => {
    let wStart = parseTimeToMinutes(cond.startTime);
    if (wStart === null) return false;

    let wEnd;
    if (cond.endTime && cond.endTime !== cond.startTime) {
      wEnd = parseTimeToMinutes(cond.endTime);
    } else {
      wEnd = wStart + 180; // Default 3-hour window for single 3-hr forecast entry
    }

    if (wEnd === null) return false;

    if (wEnd <= wStart) {
      wEnd += 1440; // Midnight wrap
    }

    return actStart < wEnd && actEnd > wStart;
  });
};

/**
 * Analyzes OpenWeather forecast data mapped to a specific trip's calendar dates and activities.
 * Groups activities and adverse weather conditions by dayNumber.
 * 
 * @param {string} tripId - ID of the target trip workspace.
 * @returns {Promise<Object>} Trip weather analysis payload grouped by dayNumber.
 */
export const analyzeWeatherForTrip = async (tripId) => {
  if (!tripId) {
    throw new ApiError(400, 'Trip ID is required for weather analysis.');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  let activities = [];
  if (trip.activeItinerary) {
    activities = await Activity.find({
      tripId,
      itineraryId: trip.activeItinerary
    }).sort({
      dayNumber: 1,
      order: 1,
      time: 1
    });
  }

  const weatherData = await getWeatherForecast(trip.destination);
  const fullAnalysis = analyzeWeatherForecast(weatherData);

  // Extract set of actual calendar dates (YYYY-MM-DD) present in the OpenWeather forecast window
  const forecastAvailableDates = new Set();
  if (weatherData && Array.isArray(weatherData.list)) {
    weatherData.list.forEach((entry) => {
      if (entry?.dt_txt) {
        const datePart = entry.dt_txt.split(' ')[0];
        forecastAvailableDates.add(datePart);
      }
    });
  }

  const startDateIso = new Date(trip.startDate).toISOString().split('T')[0];

  const maxActivityDay = activities.reduce(
    (max, act) => Math.max(max, act.dayNumber || 1),
    1
  );

  let calculatedTripDays = 1;
  if (trip.startDate && trip.endDate) {
    const diffTime = new Date(trip.endDate) - new Date(trip.startDate);
    calculatedTripDays = Math.max(
      1,
      Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
    );
  }

  const totalDays = Math.max(calculatedTripDays, maxActivityDay);

  const days = [];

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const baseDate = new Date(trip.startDate);
    baseDate.setUTCDate(baseDate.getUTCDate() + (dayNum - 1));
    const calendarDate = baseDate.toISOString().split('T')[0];

    const dayActivities = activities.filter((act) => act.dayNumber === dayNum);

    // Verify if OpenWeather returned forecast entries for this specific calendar date
    const isForecastAvailable = forecastAvailableDates.has(calendarDate);

    const rawDayConditions = isForecastAvailable
      ? (fullAnalysis.conditions || []).filter(
          (cond) => cond.time && cond.time.startsWith(calendarDate)
        )
      : [];

    const dayWeatherConditions = groupConsecutiveConditions(rawDayConditions);

    const hasSevereWeather = isForecastAvailable && dayWeatherConditions.length > 0;

    days.push({
      dayNumber: dayNum,
      date: calendarDate,
      activities: dayActivities,
      weatherConditions: dayWeatherConditions,
      hasSevereWeather,
      isForecastAvailable,
      statusMessage: !isForecastAvailable
        ? 'Forecast unavailable for this date'
        : hasSevereWeather
        ? 'Severe weather expected'
        : 'Good weather'
    });
  }

  const severeDays = days.filter((d) => d.hasSevereWeather);
  if (severeDays.length > 0) {
    try {
      const acceptedMembers = await TripMember.find({ tripId, inviteStatus: 'ACCEPTED' });
      const recipientUserIds = new Set();
      if (trip.createdBy) recipientUserIds.add(trip.createdBy.toString());
      acceptedMembers.forEach((m) => {
        if (m.userId) recipientUserIds.add(m.userId.toString());
      });

      const title = '🌦️ Severe Weather Alert';
      const firstSevereDay = severeDays[0];
      const conditionSummary = firstSevereDay.weatherConditions.map((c) => c.summaryText || c.condition).join(', ') || 'Adverse weather conditions';
      const message = `Severe weather detected for "${trip.title}" (${trip.destination}) on Day ${firstSevereDay.dayNumber} (${firstSevereDay.date}): ${conditionSummary}.`;

      for (const recipientId of recipientUserIds) {
        // Duplicate protection: check if severe weather alert notification was already dispatched for this recipient & trip
        const existingNotif = await Notification.findOne({
          tripId,
          recipientId,
          type: 'WEATHER_ALERT',
          title
        });

        if (!existingNotif) {
          await createNotification({
            recipientId,
            senderId: null,
            tripId: trip._id,
            type: 'WEATHER_ALERT',
            title,
            message,
            actionUrl: `/dashboard/trip/${trip._id}`
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification Error - WEATHER_ALERT]:', notifErr.message);
    }
  }

  const availableDays = days.filter((d) => d.isForecastAvailable);
  const hasAvailableForecasts = availableDays.length > 0;
  const allForecastsAvailable = days.length > 0 && availableDays.length === days.length;
  const hasSevereWeather = severeDays.length > 0;

  const severeConditions = [];
  severeDays.forEach((d) => {
    (d.weatherConditions || []).forEach((c) => {
      severeConditions.push({
        ...c,
        date: d.date,
        dayNumber: d.dayNumber
      });
    });
  });

  let overallSummary = '';
  if (!hasAvailableForecasts) {
    overallSummary = 'Weather forecast data is currently unavailable for these trip dates (forecasts are available up to 5 days in advance).';
  } else if (hasSevereWeather) {
    const typesSummary = Array.from(new Set(severeConditions.map((c) => c.condition))).join(' and ') || 'Severe weather';
    overallSummary = `${typesSummary} expected during the trip. Review day-by-day advisories and adjust scheduled activities accordingly.`;
  } else if (!allForecastsAvailable) {
    overallSummary = 'Fair weather conditions for upcoming dates with forecast data. Remaining dates are outside the 5-day forecast window.';
  } else {
    overallSummary = 'Fair weather conditions expected across all trip dates with no severe weather alerts.';
  }

  return {
    tripId: trip._id.toString(),
    destination: trip.destination,
    startDate: startDateIso,
    hasAvailableForecasts,
    allForecastsAvailable,
    hasSevereWeather,
    severeConditions,
    overallSummary,
    days
  };
};

/**
 * Automatically re-optimizes a trip's stored activities using Gemini AI for days with severe weather alerts.
 * Updates matching Activity documents in MongoDB while preserving IDs, day numbers, createdBy, and completion status.
 * 
 * @param {string} tripId - ID of the target trip workspace.
 * @returns {Promise<Object>} Summary payload containing optimizedDays and unchangedDays lists.
 */
export const optimizeTripScheduleForWeather = async (tripId) => {
  if (!tripId) {
    throw new ApiError(400, 'Trip ID is required for weather optimization.');
  }

  // Reuse existing date-mapped weather analysis helper
  const tripAnalysis = await analyzeWeatherForTrip(tripId);

  const optimizedDays = [];
  const unchangedDays = [];

  for (const day of tripAnalysis.days) {
    // Only optimize if severe weather exists AND the day has stored activities
    if (day.hasSevereWeather && day.activities && day.activities.length > 0) {
      // Filter ONLY activities whose time interval overlaps a severe weather alert on this day
      const overlappingActivities = day.activities.filter((act) =>
        isActivityOverlappingSevereWeather(act, day.weatherConditions)
      );

      // If no activities overlap severe weather on this day, record as unchanged
      if (overlappingActivities.length === 0) {
        unchangedDays.push(day.dayNumber);
        continue;
      }

      const conditionSummaries = day.weatherConditions
        .map((c) => `${c.condition} (${c.description})`)
        .join(', ');

      const weatherAlert = `${conditionSummaries} expected on ${day.date}. Outdoor activities should be replaced with suitable indoor alternatives.`;

      // Format ONLY overlapping activities into clean plain objects expected by aiService.optimizeScheduleForWeather
      const currentActivitiesToSend = overlappingActivities.map((act) => ({
        time: act.time || '',
        title: act.title,
        description: act.description || '',
        locationName: act.location?.name || '',
        estimatedCost: act.estimatedCost || 0,
        estimatedDurationMinutes: act.estimatedDurationMinutes || 60
      }));

      // Invoke Gemini AI ONLY with overlapping activities
      const optimizedAiActivities = await optimizeScheduleForWeather(
        currentActivitiesToSend,
        weatherAlert
      );

      // Safeguard: If Gemini fails validation or returns unexpected length, preserve existing activities
      if (
        !Array.isArray(optimizedAiActivities) ||
        optimizedAiActivities.length !== overlappingActivities.length
      ) {
        unchangedDays.push(day.dayNumber);
        continue;
      }

      const updatedDayActivities = [];
      const overlappingDocIds = new Set(
        overlappingActivities.map((a) => a._id.toString())
      );

      for (let i = 0; i < day.activities.length; i++) {
        const originalDoc = day.activities[i];

        if (overlappingDocIds.has(originalDoc._id.toString())) {
          const aiIndex = overlappingActivities.findIndex(
            (a) => a._id.toString() === originalDoc._id.toString()
          );
          const aiOpt = optimizedAiActivities[aiIndex] || {};

          const updateData = {
            title: aiOpt.title || originalDoc.title,
            description: aiOpt.description || originalDoc.description,
            time: aiOpt.time || originalDoc.time,
            location: {
              name: aiOpt.locationName || originalDoc.location?.name || '',
              address: originalDoc.location?.address || '',
              coordinates: originalDoc.location?.coordinates || { lat: null, lng: null }
            },
            estimatedCost:
              typeof aiOpt.estimatedCost === 'number'
                ? aiOpt.estimatedCost
                : originalDoc.estimatedCost,
            estimatedDurationMinutes:
              typeof aiOpt.estimatedDurationMinutes === 'number'
                ? aiOpt.estimatedDurationMinutes
                : originalDoc.estimatedDurationMinutes,
            isWeatherOptimized: true
          };

          const updatedDoc = await updateActivity(
            tripId,
            originalDoc._id,
            updateData
          );
          updatedDayActivities.push(updatedDoc);
        } else {
          // Unaffected activity remains untouched in DB
          updatedDayActivities.push(originalDoc);
        }
      }

      optimizedDays.push({
        dayNumber: day.dayNumber,
        date: day.date,
        weatherConditions: day.weatherConditions,
        activities: updatedDayActivities
      });
    } else {
      unchangedDays.push(day.dayNumber);
    }
  }

  return {
    tripId: tripAnalysis.tripId,
    destination: tripAnalysis.destination,
    optimizedDays,
    unchangedDays
  };
};

