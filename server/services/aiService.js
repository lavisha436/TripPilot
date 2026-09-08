import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * 🤖 AIService: Core Generative AI Service Layer (Powered by Google Gemini SDK @google/genai).
 * Handles preference-based destination recommendations, automated day-wise itinerary generation,
 * smart packing checklist creation, and adaptive weather schedule re-optimizations.
 */

/**
 * Helper to initialize the GoogleGenAI client with API key validation.
 */
const getAiClient = () => {
  if (!ENV.GEMINI_API_KEY) {
    throw new ApiError(
      500,
      'Google Gemini API key is unconfigured. Please set GEMINI_API_KEY in server environment.'
    );
  }
  return new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
};

/**
 * Centralized error handler to map Google Gemini SDK failures into clean operational ApiErrors.
 */
const handleAiError = (error) => {
  if (error instanceof ApiError) {
    throw error;
  }

  const status = error?.status || error?.code;

  if (status === 401 || status === 403) {
    throw new ApiError(
      502,
      'AI service authentication failed. Please check the Gemini API configuration.'
    );
  }

  if (status === 429) {
    throw new ApiError(
      429,
      'AI service rate limit reached. Please try again later.'
    );
  }

  if (status === 503) {
    throw new ApiError(
      503,
      'AI service is temporarily unavailable. Please try again later.'
    );
  }

  throw new ApiError(
    502,
    'AI service request failed. Please try again later.'
  );
};

/**
 * Helper to strip markdown code blocks and parse JSON responses cleanly.
 */
const cleanAndParseJson = (text) => {
  try {
    const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    throw new ApiError(
      500,
      `AI Service response parsing error: ${error.message}`
    );
  }
};

/**
 * Helper to validate destination recommendations structure returned by Gemini AI.
 */
const validateDestinationsResponse = (destinations) => {
  if (!Array.isArray(destinations)) {
    throw new ApiError(
      502,
      'AI service returned an invalid destination recommendations format.'
    );
  }

  if (destinations.length !== 4) {
    throw new ApiError(
      502,
      'AI service returned an invalid number of destination recommendations.'
    );
  }

  for (const destination of destinations) {
    if (!destination || typeof destination !== 'object') {
      throw new ApiError(
        502,
        'AI service returned an invalid destination object.'
      );
    }

    if (
      !destination.destination ||
      typeof destination.destination !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned a destination without a valid destination name.'
      );
    }

    if (
      !destination.location ||
      typeof destination.location !== 'object'
    ) {
      throw new ApiError(
        502,
        'AI service returned a destination without valid location information.'
      );
    }

    if (
      !destination.location.city ||
      typeof destination.location.city !== 'string' ||
      !destination.location.state ||
      typeof destination.location.state !== 'string' ||
      !destination.location.country ||
      typeof destination.location.country !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned incomplete destination location information.'
      );
    }

    if (
      typeof destination.matchPercentage !== 'number' ||
      destination.matchPercentage < 0 ||
      destination.matchPercentage > 100
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid destination match percentage.'
      );
    }

    if (
      !destination.shortDescription ||
      typeof destination.shortDescription !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned a destination without a valid description.'
      );
    }

    if (!Array.isArray(destination.pros)) {
      throw new ApiError(
        502,
        'AI service returned invalid destination pros.'
      );
    }

    if (!Array.isArray(destination.cons)) {
      throw new ApiError(
        502,
        'AI service returned invalid destination cons.'
      );
    }

    if (
      typeof destination.estimatedBudgetCost !== 'number' ||
      destination.estimatedBudgetCost < 0
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid destination budget estimate.'
      );
    }

    if (
      !destination.bestTimeToVisit ||
      typeof destination.bestTimeToVisit !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid best-time-to-visit value.'
      );
    }
  }

  return destinations;
};

/**
 * Helper to validate itinerary structure and day counts returned by Gemini AI.
 */
const validateItineraryResponse = (result, expectedDurationDays) => {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ApiError(
      502,
      'AI service returned an invalid itinerary format.'
    );
  }

  if (!Array.isArray(result.dayWiseItinerary)) {
    throw new ApiError(
      502,
      'AI service returned an invalid day-wise itinerary format.'
    );
  }

  if (result.dayWiseItinerary.length !== expectedDurationDays) {
    throw new ApiError(
      502,
      'AI service returned an itinerary with an invalid number of days.'
    );
  }

  for (const day of result.dayWiseItinerary) {
    if (!day || typeof day !== 'object') {
      throw new ApiError(
        502,
        'AI service returned an invalid itinerary day.'
      );
    }

    if (
      typeof day.dayNumber !== 'number' ||
      day.dayNumber < 1
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid itinerary day number.'
      );
    }

    if (!day.title || typeof day.title !== 'string') {
      throw new ApiError(
        502,
        'AI service returned an itinerary day without a valid title.'
      );
    }

    if (!Array.isArray(day.activities) || day.activities.length === 0) {
      throw new ApiError(
        502,
        'AI service returned an itinerary day without valid activities.'
      );
    }

    for (const activity of day.activities) {
      if (!activity || typeof activity !== 'object') {
        throw new ApiError(
          502,
          'AI service returned an invalid itinerary activity.'
        );
      }

      if (!activity.time || typeof activity.time !== 'string') {
        throw new ApiError(
          502,
          'AI service returned an activity without a valid time.'
        );
      }

      if (!activity.title || typeof activity.title !== 'string') {
        throw new ApiError(
          502,
          'AI service returned an activity without a valid title.'
        );
      }

      if (
        !activity.description ||
        typeof activity.description !== 'string'
      ) {
        throw new ApiError(
          502,
          'AI service returned an activity without a valid description.'
        );
      }

      if (
        !activity.locationName ||
        typeof activity.locationName !== 'string'
      ) {
        throw new ApiError(
          502,
          'AI service returned an activity without a valid location.'
        );
      }

      if (
        typeof activity.estimatedCost !== 'number' ||
        activity.estimatedCost < 0
      ) {
        throw new ApiError(
          502,
          'AI service returned an invalid activity cost.'
        );
      }

      if (
        typeof activity.estimatedDurationMinutes !== 'number' ||
        activity.estimatedDurationMinutes <= 0
      ) {
        throw new ApiError(
          502,
          'AI service returned an invalid activity duration.'
        );
      }
    }
  }

  return result;
};

/**
 * Helper to validate packing checklist items and structure returned by Gemini AI.
 */
const validatePackingListResponse = (packingList) => {
  const allowedCategories = [
    'Documents',
    'Clothing',
    'Electronics',
    'Toiletries',
    'Health',
    'Misc'
  ];

  if (!Array.isArray(packingList)) {
    throw new ApiError(
      502,
      'AI service returned an invalid packing list format.'
    );
  }

  if (packingList.length < 12 || packingList.length > 18) {
    throw new ApiError(
      502,
      'AI service returned an invalid number of packing list items.'
    );
  }

  for (const item of packingList) {
    if (!item || typeof item !== 'object') {
      throw new ApiError(
        502,
        'AI service returned an invalid packing list item.'
      );
    }

    if (!item.item || typeof item.item !== 'string') {
      throw new ApiError(
        502,
        'AI service returned a packing item without a valid name.'
      );
    }

    if (
      !item.category ||
      typeof item.category !== 'string' ||
      !allowedCategories.includes(item.category)
    ) {
      throw new ApiError(
        502,
        'AI service returned a packing item with an invalid category.'
      );
    }

    if (typeof item.isPacked !== 'boolean') {
      throw new ApiError(
        502,
        'AI service returned an invalid packing item status.'
      );
    }
  }

  return packingList;
};

/**
 * Helper to validate re-optimized weather activities array returned by Gemini AI.
 */
const validateOptimizedActivitiesResponse = (activities, expectedCount) => {
  if (!Array.isArray(activities)) {
    throw new ApiError(
      502,
      'AI service returned an invalid optimized activities format.'
    );
  }

  if (activities.length === 0) {
    throw new ApiError(
      502,
      'AI service returned an empty optimized activities list.'
    );
  }

  if (typeof expectedCount === 'number' && activities.length !== expectedCount) {
    throw new ApiError(
      502,
      'AI service returned an optimized activity list with an invalid number of activities.'
    );
  }

  for (const activity of activities) {
    if (!activity || typeof activity !== 'object') {
      throw new ApiError(
        502,
        'AI service returned an invalid optimized activity.'
      );
    }

    if (!activity.time || typeof activity.time !== 'string') {
      throw new ApiError(
        502,
        'AI service returned an optimized activity without a valid time.'
      );
    }

    if (!activity.title || typeof activity.title !== 'string') {
      throw new ApiError(
        502,
        'AI service returned an optimized activity without a valid title.'
      );
    }

    if (
      !activity.description ||
      typeof activity.description !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned an optimized activity without a valid description.'
      );
    }

    if (
      !activity.locationName ||
      typeof activity.locationName !== 'string'
    ) {
      throw new ApiError(
        502,
        'AI service returned an optimized activity without a valid location.'
      );
    }

    if (
      typeof activity.estimatedCost !== 'number' ||
      activity.estimatedCost < 0
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid optimized activity cost.'
      );
    }

    if (
      typeof activity.estimatedDurationMinutes !== 'number' ||
      activity.estimatedDurationMinutes <= 0
    ) {
      throw new ApiError(
        502,
        'AI service returned an invalid optimized activity duration.'
      );
    }
  }

  return activities;
};

/**
 * Recommends destinations matching travel budget, companion type, duration, and interests.
 * 
 * @param {Object} preferences - User travel preferences.
 * @returns {Promise<Array>} Array of destination recommendation objects.
 */
export const discoverDestinations = async (preferences) => {
  const {
    budgetType,
    budget,
    travelerCount,
    travelCompanion,
    durationDays,
    interests,
    startingLocation
  } = preferences;

  if (!budget || budget <= 0) {
    throw new ApiError(400, 'Valid trip budget is required.');
  }

  if (!travelerCount || travelerCount < 1) {
    throw new ApiError(400, 'Valid traveler count is required.');
  }

  if (!durationDays || durationDays < 1) {
    throw new ApiError(400, 'Valid trip duration is required.');
  }

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    throw new ApiError(400, 'At least one travel interest is required.');
  }

  if (!startingLocation) {
    throw new ApiError(400, 'Starting location is required.');
  }


  const prompt = `
Act as an expert AI Travel Planner. Recommend top 4 travel destinations specifically matching these user preferences:
- Selected Interests (MANDATORY MATCHING CRITERIA): ${interests.join(', ')}
- Starting Location: ${startingLocation || 'Not specified'}
- Total Trip Budget: ₹${budget} (for all ${travelerCount} traveler(s) combined)
- Number of Travelers: ${travelerCount}
- Budget Tier: ${budgetType}
- Travel Style / Companion: ${travelCompanion}
- Trip Duration: ${durationDays} days

MANDATORY CONSTRAINTS:
1. INTEREST MATCHING (STRICT HIGHEST PRIORITY):
   - Every recommended destination MUST meaningfully satisfy at least one of the user's selected interests: ${interests.join(', ')}.
   - Prefer destinations that satisfy MULTIPLE selected interests simultaneously.
   - SPECIFIC INTEREST DIRECTIVES:
     * If "Beaches" is selected: You MUST prioritize coastal / beach destinations (e.g., Goa, Gokarna, Varkala, Pondicherry, Andaman, Alibaug, Kovalam, Daman, Malvan). Do NOT recommend landlocked or mountain destinations (like Jaipur, Udaipur, Rishikesh, or Kasol) if "Beaches" is among the selected interests!
     * If "Trekking" is selected: You MUST prioritize destinations known for hiking trails and mountain/hill terrain (e.g., Manali, Kasol, Leh, Munnar, Coorg, Wayanad, Dharamshala).
     * If "Nightlife" is selected: You MUST prioritize destinations with vibrant evening culture, pubs, clubs, or beach shacks (e.g., Goa, Mumbai, Bangalore, Pondicherry).
     * If "Food" is selected: You MUST prioritize destinations famous for rich regional cuisine, street food, and dining experiences (e.g., Amritsar, Kolkata, Hyderabad, Goa, Lucknow, Old Delhi).
     * If "Nature" or "Wildlife" is selected: You MUST prioritize national parks, hill stations, lakes, or nature reserves (e.g., Jim Corbett, Wayanad, Kaziranga, Kabini, Munnar, Ooty).

2. MATCH PERCENTAGE ACCURACY:
   - "matchPercentage" (0-100) MUST directly reflect the genuine overlap between the destination's offerings and ALL user preferences (especially selected interests, budget, and starting location).
   - If a destination fails to satisfy the user's primary selected interests, its matchPercentage MUST NOT exceed 60%.
   - Give 90%+ matchPercentage ONLY to destinations that satisfy ALL or most selected interests while remaining well within budget.

3. BUDGET & LOCATION FEASIBILITY:
   - "estimatedBudgetCost" MUST represent the estimated TOTAL actual trip cost for ALL ${travelerCount} travelers combined (in INR), covering round-trip transport from ${startingLocation || 'starting location'}, accommodation, food, and activities.
   - Only recommend destinations where total cost reasonably fits within the user's maximum budget of ₹${budget}.
   - Prioritize destinations realistically reachable from ${startingLocation}. Do NOT recommend international destinations unless the budget realistically supports it.

4. LOCATION SCHEMA:
   - For every destination, provide exact "location.city", "location.state", and "location.country".

Respond ONLY with a valid JSON array of 4 objects matching this exact schema:
[
  {
    "destination": "Goa",
    "location": {
      "city": "Panaji",
      "state": "Goa",
      "country": "India"
    },
    "matchPercentage": 96,
    "shortDescription": "Perfect match for beaches, seafood dining, and vibrant nightlife.",
    "pros": ["Beautiful sandy beaches & shacks", "Vibrant nightlife & live music", "Famous coastal seafood"],
    "cons": ["Popular beaches can be crowded during peak season"],
    "estimatedBudgetCost": 18000,
    "bestTimeToVisit": "November to February"
  }
]
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const destinations = cleanAndParseJson(response.text);
    return validateDestinationsResponse(destinations);
  } catch (error) {
    handleAiError(error);
  }
};

/**
 * Generates a full day-by-day itinerary schedule (Morning, Afternoon, Evening) for a trip.
 * 
 * @param {Object} tripParams - Trip details for schedule generation.
 * @returns {Promise<Object>} Object containing dayWiseItinerary schedule.
 */
export const generateItinerary = async (tripParams) => {
  const {
    destination,
    budget,
    travelerCount,
    durationDays,
    travelCompanion,
    budgetType,
    interests
  } = tripParams;

  if (!destination) {
    throw new ApiError(400, 'Destination is required for AI itinerary generation.');
  }

  if (!budget || budget <= 0) {
    throw new ApiError(400, 'Valid trip budget is required.');
  }

  if (!travelerCount || travelerCount < 1) {
    throw new ApiError(400, 'Valid traveler count is required.');
  }

  if (!durationDays || durationDays < 1) {
    throw new ApiError(400, 'Valid trip duration is required.');
  }

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    throw new ApiError(400, 'At least one travel interest is required.');
  }

  if (!budgetType) {
    throw new ApiError(400, 'Budget type is required.');
  }

  if (!travelCompanion) {
    throw new ApiError(400, 'Travel companion type is required.');
  }

  const prompt = `
Act as an expert AI Travel Concierge. Generate a complete ${durationDays}-day travel itinerary for a trip to "${destination}".
Context:
- Available Itinerary Budget: ₹${budget} for all ${travelerCount} travelers combined (for day-to-day itinerary activities, dining, and local travel)
- Companion Type: ${travelCompanion}
- Budget Tier: ${budgetType}
- Traveler Interests: ${interests.join(', ')}

BUDGET CONSTRAINTS & ALLOCATION RULES:
1. The provided budget of ₹${budget} is the total amount available strictly for day-to-day itinerary costs for all ${travelerCount} travelers combined.
2. Intercity transportation (flights, trains, intercity buses) is ALREADY reserved separately. Do NOT include flights, trains, buses, or intercity transport in itinerary costs.
3. Accommodation (hotels, resorts, lodging) is ALREADY reserved separately. Do NOT include hotel or accommodation costs in itinerary costs.
4. Emergency and miscellaneous buffers are ALREADY reserved separately.
5. The itinerary budget of ₹${budget} is specifically for:
   - Food and meals
   - Local transportation (taxis, autos, metros, local buses)
   - Sightseeing activities and entry fees
   - Equipment or activity fees
   - Guide fees when applicable
6. Keep the complete itinerary realistic for the available itinerary budget of ₹${budget}. Activity costs across all days combined must fit comfortably within this available budget.

"estimatedCost" must be a realistic numerical estimate of the TOTAL
cost of that specific activity for ALL ${travelerCount} travelers combined.

ESTIMATED COST CALCULATION RULES:
1. PER-PERSON COSTS:
   - For per-person expenses (such as meals, restaurant/breakfast/lunch/dinner, entry tickets, museum/attraction tickets, individual activity tickets, individual transit passes), calculate the group total using travelerCount.
   - Example: If lunch is ₹400/person and there are ${travelerCount} travelers, the lunch cost should be approximately ₹400 × ${travelerCount}.
   - Do NOT report a single-person price as the group total.

2. SHARED GROUP COSTS:
   - For shared expenses (such as a taxi/cab ride, auto ride, private vehicle rental, group guide fee, or fixed group charge), estimate the total shared cost for the entire group rather than multiplying by travelerCount.

3. MEALS:
   - For every meal included in an activity, estimate a realistic per-person meal price appropriate for "${destination}" and the "${budgetType}" budget tier, then account for all ${travelerCount} travelers.
   - Do NOT use unrealistically low amounts (such as ₹50 or ₹100 for a complete meal for the entire group).

4. PAID ACTIVITIES:
   - For activities with per-person pricing, multiply the realistic per-person price by ${travelerCount}.
   - For activities with a fixed group price, use the group price.

5. FREE ACTIVITIES:
   - Use estimatedCost = 0 ONLY when the specific activity is genuinely free and has no meaningful direct cost.
   - Examples of potentially free activities: public beaches, public viewpoints, walking around public areas, free public parks, sightseeing with no entry fee.
   - Do NOT use 0 merely because an exact price is unknown.

6. LOCAL TRANSPORTATION:
   - Include realistic local transportation costs when directly associated with the activity.
   - For shared transport (cabs/autos), estimate the group fare.
   - For per-person public transport (metro/bus passes), account for all ${travelerCount} travelers.

7. OVERALL REALISM:
   - All estimatedCost values must represent realistic TOTAL costs for ${travelerCount} travelers combined using the ${budgetType} budget tier and destination price levels.
   - Do not intentionally make costs unrealistically low just to fit the itinerary budget.
   - At the same time, keep the complete itinerary within the available itinerary budget of ₹${budget} as instructed by the budget rules.

Do not include the cost of accommodation, intercity transport, or unrelated activities in
"estimatedCost". Only include costs directly associated with that
specific activity.

"estimatedDurationMinutes" must be a realistic numerical estimate of
how long that specific activity takes, in minutes. Calculate a
different duration based on the activity rather than copying the
example value.

Respond ONLY with a valid JSON object with the following schema:
{
  "dayWiseItinerary": [
    {
      "dayNumber": 1,
      "title": "Day 1 Theme Title",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity Name",
          "description": "Short explanation of activity",
          "locationName": "Landmark or Location Name",
          "estimatedCost": 0,
          "estimatedDurationMinutes": 120
        }
      ]
    }
  ]
}
Generate 3 to 4 activities per day spanning Morning, Afternoon, and Evening.
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = cleanAndParseJson(response.text);
    return validateItineraryResponse(result, durationDays);
  } catch (error) {
    handleAiError(error);
  }
};

/**
 * Generates a dynamic packing list checklist categorized by item type.
 * 
 * @param {Object} tripParams - Trip metadata.
 * @returns {Promise<Array>} Array of packing checklist items.
 */
export const generatePackingList = async (tripParams) => {
  const {
    destination,
    durationDays,
    travelCompanion,
    interests
  } = tripParams;

  if (!destination) {
    throw new ApiError(
      400,
      'Destination is required for AI packing list generation.'
    );
  }

  if (!durationDays || durationDays < 1) {
    throw new ApiError(400, 'Valid trip duration is required.');
  }

  if (!travelCompanion) {
    throw new ApiError(400, 'Travel companion type is required.');
  }

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    throw new ApiError(400, 'At least one travel interest is required.');
  }

  const prompt = `
Act as an expert travel assistant. Generate a dynamic packing checklist for a ${durationDays}-day trip to "${destination}".
Context:
- Travel Companion: ${travelCompanion}
- Planned Activities: ${interests.join(', ')}

The packing list must be specifically tailored to the destination,
trip duration, travel companion type, and planned activities.

Consider the destination's typical climate, terrain, and travel
conditions when selecting items.

Do not generate a generic packing list.

Respond ONLY with a valid JSON array of objects.
Format schema per item:
[
  {
    "item": "Item Description Name",
    "category": "One of [Documents, Clothing, Electronics, Toiletries, Health, Misc]",
    "isPacked": false
  }
]
Provide 12 to 18 essential items tailored specifically to the destination and activities.
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const packingList = cleanAndParseJson(response.text);
    return validatePackingListResponse(packingList);
  } catch (error) {
    handleAiError(error);
  }
};

/**
 * Re-optimizes an existing schedule for unexpected bad weather (e.g. swapping outdoor to indoor activities).
 * 
 * @param {Array} currentActivities - Existing day's activity objects.
 * @param {string} weatherAlert - Description of bad weather condition.
 * @returns {Promise<Array>} Re-optimized activities list.
 */
export const optimizeScheduleForWeather = async (currentActivities, weatherAlert) => {
  if (!Array.isArray(currentActivities) || currentActivities.length === 0) {
    throw new ApiError(400, 'Current activities list is required for weather re-optimization.');
  }

  if (!weatherAlert) {
    throw new ApiError(
      400,
      'Weather alert is required for schedule re-optimization.'
    );
  }

  const prompt = `
Act as an adaptive travel optimizer. Re-optimize this day's activity schedule due to a severe weather alert.
Weather Alert Condition: "${weatherAlert}"

Current Schedule Activities:
${JSON.stringify(currentActivities, null, 2)}

Instructions:
1. Replace outdoor or exposed activities with suitable indoor alternatives (e.g. museums, indoor markets, art galleries, spa, cafes).
2. Keep times and estimated durations reasonable.
3. Respond ONLY with a valid JSON array of the updated activities matching the original array structure.
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const optimizedActivities = cleanAndParseJson(response.text);

    return validateOptimizedActivitiesResponse(
      optimizedActivities,
      currentActivities.length
    );
  } catch (error) {
    handleAiError(error);
  }
};

/**
 * Re-optimizes an existing day-wise schedule to fit within a target itinerary budget.
 * 
 * @param {Array} activities - Array of candidate activity objects.
 * @param {number} targetBudget - Maximum allowable total itinerary budget.
 * @param {number} currentTotal - Current sum of all activity estimated costs.
 * @returns {Promise<Array>} Array of optimized activity objects.
 */
export const optimizeScheduleForBudget = async (activities, targetBudget, currentTotal) => {
  if (!Array.isArray(activities) || activities.length === 0) {
    throw new ApiError(400, 'Activities list is required for budget optimization.');
  }

  if (targetBudget === undefined || targetBudget === null || typeof targetBudget !== 'number' || targetBudget < 0) {
    throw new ApiError(400, 'Valid non-negative target itinerary budget is required for optimization.');
  }

  const prompt = `
Act as an expert travel budget optimizer. Re-optimize this travel itinerary schedule so that the total sum of all activity "estimatedCost" values is LESS THAN OR EQUAL TO ₹${targetBudget}.

Context & Constraints:
- Current Sum of Activity Costs: ₹${currentTotal}
- Target Itinerary Budget Limit: ₹${targetBudget} (for ALL travelers combined)
- Current Activities Schedule:
${JSON.stringify(activities, null, 2)}

RE-OPTIMIZATION RULES:
1. The target budget limit of ₹${targetBudget} is the TOTAL amount available for ALL travelers combined for day-to-day itinerary activities, dining, and local transit.
2. Preserve the trip dates/day structure and as many activities as reasonably possible.
3. Reduce costs by replacing expensive activities with lower-cost alternatives where appropriate.
4. Prefer free or lower-cost alternatives before removing important activities.
5. Adjust unrealistic estimates when appropriate.
6. Keep meals, local transport, entry fees, and activity costs realistic for all travelers combined.
7. Do NOT introduce hotel or accommodation costs.
8. Do NOT introduce flights, trains, or intercity transportation costs.
9. Do NOT change the number of travelers.
10. Do NOT simply divide costs mathematically just to meet the budget.
11. Do NOT return negative costs ("estimatedCost" must be >= 0).
12. The final sum of all "estimatedCost" values across all activities MUST BE <= ₹${targetBudget}.

Respond ONLY with a valid JSON array of objects with the exact same activity structure:
[
  {
    "dayNumber": 1,
    "time": "09:00",
    "title": "Activity Name",
    "description": "Short explanation of activity",
    "locationName": "Landmark or Location Name",
    "estimatedCost": 0,
    "estimatedDurationMinutes": 120
  }
]
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const optimized = cleanAndParseJson(response.text);
    if (!Array.isArray(optimized)) {
      throw new ApiError(400, 'AI optimization returned invalid data format.');
    }

    return optimized.map((act) => ({
      dayNumber: Number(act.dayNumber) || 1,
      time: act.time || '09:00',
      title: act.title || 'Activity',
      description: act.description || '',
      locationName: act.locationName || act.location?.name || '',
      estimatedCost: Math.max(0, Number(act.estimatedCost) || 0),
      estimatedDurationMinutes: Number(act.estimatedDurationMinutes) || 60
    }));
  } catch (error) {
    handleAiError(error);
  }
};


/**
 * Generates an After-the-Trip AI Travel Summary based on trip details, completed activities,
 * expenses, and photo gallery media.
 * 
 * @param {Object} payload
 * @param {Object} payload.trip - Trip details (title, destination, startDate, endDate, budget, etc.).
 * @param {Array} [payload.activities] - Trip activities list.
 * @param {Array|Object} [payload.expenses] - Trip expenses list or expense summary object.
 * @param {Array} [payload.gallery] - Shared trip gallery items list.
 * @returns {Promise<Object>} Generated trip summary JSON object.
 */
export const generateTripSummary = async ({ trip, activities = [], expenses = [], gallery = [] }) => {
  if (!trip || !trip.destination) {
    throw new ApiError(400, 'Valid trip details with destination are required to generate a summary.');
  }

  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : (expenses?.expenses || []);
  const safeGallery = Array.isArray(gallery) ? gallery : [];

  const completedActivities = safeActivities.filter((a) => a.isCompleted);
  const galleryCount = safeGallery.length;

  const totalSpent = safeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const currency = trip.budget?.currency || 'INR';
  const budget = Number(trip.budget?.estimated) || 0;

  const prompt = `
Act as a personal travel journalist and recap compiler. Create an engaging after-the-trip summary based ONLY on the provided trip workspace data.
Do NOT invent or hallucinate activities, expenses, locations, or memories that are not present in the supplied data.

Trip Details:
- Title: "${trip.title || 'Trip'}"
- Destination: "${trip.destination}"
- Dates: ${trip.startDate || 'N/A'} to ${trip.endDate || 'N/A'}
- Estimated Budget: ${currency} ${budget}
- Total Spend Logged: ${currency} ${totalSpent}

Activities Data (${safeActivities.length} total, ${completedActivities.length} completed):
${JSON.stringify(
  safeActivities.map((a) => ({
    title: a.title,
    dayNumber: a.dayNumber,
    location: a.location?.name || a.location || '',
    isCompleted: !!a.isCompleted
  })),
  null,
  2
)}

Expense Summary Data:
- Logged Expenses Count: ${safeExpenses.length}
- Total Amount Spent: ${currency} ${totalSpent}
- Budget Goal: ${currency} ${budget}

Shared Gallery Media:
- Total Photos/Videos Uploaded: ${galleryCount}
- Sample Captions: ${JSON.stringify(safeGallery.map((g) => g.caption).filter(Boolean))}

Instructions:
1. "headline": A short, memorable catchphrase title for the completed trip.
2. "overview": A warm 2-3 sentence paragraph summarizing the journey.
3. "keyHighlights": Array of 2-5 bullet strings highlighting top completed activities.
4. "financialRecap": A concise string analyzing total spend vs budget based strictly on the provided financial data.
5. "photoMemoriesCount": An integer equal to exactly ${galleryCount} (the number of gallery items supplied).
6. "travelerPersona": A short persona title (e.g. "Cultural Explorer", "Budget Conscious Adventurer") inferred strictly from the completed activities and travel style.

Respond ONLY with a valid JSON object matching this exact structure:
{
  "headline": "string",
  "overview": "string",
  "keyHighlights": ["string"],
  "financialRecap": "string",
  "photoMemoriesCount": ${galleryCount},
  "travelerPersona": "string"
}
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const summary = cleanAndParseJson(response.text);

    return {
      headline: summary.headline || `Memories from ${trip.destination}`,
      overview: summary.overview || `An unforgettable journey to ${trip.destination}.`,
      keyHighlights: Array.isArray(summary.keyHighlights) ? summary.keyHighlights : [],
      financialRecap: summary.financialRecap || `Total spent: ${currency} ${totalSpent} out of ${currency} ${budget} budget.`,
      photoMemoriesCount: typeof summary.photoMemoriesCount === 'number' ? summary.photoMemoriesCount : galleryCount,
      travelerPersona: summary.travelerPersona || 'Explorer'
    };
  } catch (error) {
    handleAiError(error);
  }
};

/**
 * Helper to validate reserved budget estimate response returned by Gemini AI.
 */
const validateBudgetEstimateResponse = (result) => {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ApiError(502, 'AI service returned an invalid budget estimate format.');
  }

  if (typeof result.intercityTransport !== 'number' || result.intercityTransport < 0) {
    throw new ApiError(502, 'AI service returned an invalid intercity transport estimate.');
  }

  if (typeof result.accommodation !== 'number' || result.accommodation < 0) {
    throw new ApiError(502, 'AI service returned an invalid accommodation estimate.');
  }

  if (typeof result.buffer !== 'number' || result.buffer < 0) {
    throw new ApiError(502, 'AI service returned an invalid emergency buffer estimate.');
  }

  return {
    intercityTransport: Math.round(result.intercityTransport),
    accommodation: Math.round(result.accommodation),
    buffer: Math.round(result.buffer)
  };
};

/**
 * Estimates reserved budget costs (intercity transport, accommodation, emergency buffer) for a trip workspace.
 * 
 * @param {Object} tripParams - Trip parameters for budget estimation.
 * @returns {Promise<Object>} Object containing intercityTransport, accommodation, and buffer numeric estimates.
 */
export const generateBudgetEstimate = async (tripParams) => {
  const {
    startingLocation,
    destination,
    startDate,
    endDate,
    travelerCount,
    transportationMode,
    accommodationType,
    totalBudget,
    currency = 'INR'
  } = tripParams || {};

  if (!startingLocation) {
    throw new ApiError(400, 'Starting location is required for budget estimation.');
  }

  if (!destination) {
    throw new ApiError(400, 'Destination is required for budget estimation.');
  }

  if (!travelerCount || travelerCount < 1) {
    throw new ApiError(400, 'Valid traveler count is required.');
  }

  if (!transportationMode) {
    throw new ApiError(400, 'Transportation mode is required for budget estimation.');
  }

  if (!accommodationType) {
    throw new ApiError(400, 'Accommodation preference is required for budget estimation.');
  }

  if (!totalBudget || totalBudget <= 0) {
    throw new ApiError(400, 'Valid total trip budget is required.');
  }

  // Calculate inclusive trip duration in days
  let durationDays = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0) durationDays = diffDays;
  }

  const prompt = `
Act as an expert AI Travel Budget Estimator. Estimate the fixed/reserved baseline travel costs for a trip from "${startingLocation}" to "${destination}".

Trip Context:
- Starting Location: ${startingLocation}
- Destination: ${destination}
- Trip Duration: ${durationDays} days (${durationDays > 1 ? durationDays - 1 : 1} nights)
- Travelers Count: ${travelerCount} traveler(s)
- Total Estimated Trip Budget: ${currency} ${totalBudget}
- Transportation Mode: ${transportationMode} (FLIGHT / TRAIN / BUS / OWN_VEHICLE)
- Accommodation Preference: ${accommodationType} (BUDGET / THREE_STAR / FOUR_STAR / FIVE_STAR)

ESTIMATION RULES:
1. "intercityTransport": Estimate the total round-trip transportation cost (home "${startingLocation}" → "${destination}" → home "${startingLocation}") using mode "${transportationMode}" for ALL ${travelerCount} travelers combined in ${currency}.
2. "accommodation": Estimate total lodging cost for ${durationDays > 1 ? durationDays - 1 : 1} night(s) matching preference tier "${accommodationType}" for ALL ${travelerCount} travelers combined in ${currency}.
3. "buffer": Estimate a reasonable emergency/miscellaneous buffer reserve (typically 5-10% of total budget) in ${currency}.
4. STRICT EXCLUSIONS:
   - Do NOT include food or dining expenses in these estimates.
   - Do NOT include local city transportation (taxis, metros, autos) in these estimates.
   - Do NOT include activity entry tickets, guide fees, or sightseeing expenses.
   - Only estimate the 3 specified fixed reserved baseline costs.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "intercityTransport": 0,
  "accommodation": 0,
  "buffer": 0
}
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = cleanAndParseJson(response.text);
    return validateBudgetEstimateResponse(result);
  } catch (error) {
    handleAiError(error);
  }
};


