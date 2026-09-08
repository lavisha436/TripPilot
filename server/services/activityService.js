import { Activity } from '../models/Activity.js';
import { Trip } from '../models/Trip.js';
import { Itinerary } from '../models/Itinerary.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * 🛠️ ActivityService: Core Business Logic Layer for Itinerary & Activity Operations.
 * Manages day-wise scheduling, location details, order indexing, drag-and-drop reordering,
 * and completion state toggles for trip itineraries.
 */

/**
 * Creates a new itinerary activity under a specific trip schedule.
 * Scopes activity to explicit itineraryId or trip.activeItinerary.
 * 
 * @param {string} userId - ID of the user creating the activity.
 * @param {string} tripId - Target trip workspace ID.
 * @param {Object} activityData - Activity details payload.
 * @returns {Promise<Object>} Created activity document populated with creator info.
 */
export const createActivity = async (userId, tripId, activityData) => {
  // Step 1: Verify target trip workspace exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Step 2: Determine target itineraryId
  let itineraryId = activityData.itineraryId;
  if (!itineraryId) {
    if (trip.activeItinerary) {
      itineraryId = trip.activeItinerary;
    } else {
      // Auto-create default manual itinerary if trip has no active itinerary yet
      const defaultItinerary = await Itinerary.create({
        tripId,
        title: 'Manual Plan',
        source: 'MANUAL',
        createdBy: userId
      });
      trip.activeItinerary = defaultItinerary._id;
      await trip.save();
      itineraryId = defaultItinerary._id;
    }
  }

  const dayNumber = Number(activityData.dayNumber);
  const newTimeStr = activityData.time || '09:00';

  // Helper to parse "HH:mm" time string into minutes from midnight for robust chronological comparison
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 0;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  };

  // Step 3: Determine order index chronologically by time if not explicitly supplied
  let order = activityData.order;
  if (order === undefined || order === null) {
    // Fetch all existing activities for this day (without assuming they are already chronologically ordered by order)
    const existingActivities = await Activity.find({ tripId, itineraryId, dayNumber });

    // Combine existing activities with the new activity spec for in-memory sorting
    const combinedList = [
      ...existingActivities.map((act) => ({
        _id: act._id,
        time: act.time || '09:00',
        order: act.order ?? 0,
        isNew: false
      })),
      {
        _id: 'NEW_ACTIVITY',
        time: newTimeStr,
        order: -1,
        isNew: true
      }
    ];

    // Sort combined list by actual parsed time.
    // If times are identical, place existing activities before the new activity.
    combinedList.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      if (!a.isNew && b.isNew) return -1;
      if (a.isNew && !b.isNew) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    // Re-index existing activities to contiguous order values: 0, 1, 2, 3...
    const bulkOps = [];
    combinedList.forEach((item, index) => {
      if (!item.isNew) {
        bulkOps.push({
          updateOne: {
            filter: { _id: item._id, tripId },
            update: { order: index }
          }
        });
      } else {
        order = index; // Target order for the newly created activity
      }
    });

    if (bulkOps.length > 0) {
      await Activity.bulkWrite(bulkOps);
    }
  }

  // Step 4: Create Activity document
  const activity = await Activity.create({
    ...activityData,
    tripId,
    itineraryId,
    dayNumber,
    order,
    createdBy: userId
  });

  const populatedActivity = await Activity.findById(activity._id).populate(
    'createdBy',
    'name email avatar'
  );

  return populatedActivity;
};

/**
 * Retrieves all activities for a trip's active itinerary, optionally filtered by dayNumber.
 * Results are chronologically ordered by dayNumber, order, and time.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {number|string} [dayNumberFilter] - Optional day number filter.
 * @returns {Promise<Array>} Array of sorted activity documents.
 */
export const getTripActivities = async (tripId, dayNumberFilter) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const query = { tripId };
  if (trip.activeItinerary) {
    query.itineraryId = trip.activeItinerary;
  }

  if (dayNumberFilter !== undefined && dayNumberFilter !== null && dayNumberFilter !== '') {
    query.dayNumber = Number(dayNumberFilter);
  }

  const activities = await Activity.find(query)
    .populate('createdBy', 'name email avatar')
    .sort({ dayNumber: 1, order: 1, time: 1 });

  return activities;
};

/**
 * Retrieves details for a specific activity, ensuring trip scoping.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} activityId - Target activity ID.
 * @returns {Promise<Object>} Activity document.
 */
export const getActivityById = async (tripId, activityId) => {
  const activity = await Activity.findOne({ _id: activityId, tripId }).populate(
    'createdBy',
    'name email avatar'
  );

  if (!activity) {
    throw new ApiError(404, 'Activity not found in this trip workspace.');
  }

  return activity;
};

/**
 * Updates an activity item details with explicit field allowlist validation.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} activityId - Target activity ID.
 * @param {Object} updateData - Payload of fields to update.
 * @returns {Promise<Object>} Updated activity document.
 */
export const updateActivity = async (tripId, activityId, updateData) => {
  const existingActivity = await Activity.findOne({ _id: activityId, tripId });
  if (!existingActivity) {
    throw new ApiError(404, 'Activity not found in this trip workspace.');
  }

  // Explicit allowlist filtering: prevents mutating createdBy, tripId, itineraryId, or _id
  const allowedFields = [
    'title',
    'description',
    'dayNumber',
    'order',
    'time',
    'location',
    'estimatedCost',
    'estimatedDurationMinutes',
    'isCompleted',
    'isWeatherOptimized'
  ];

  const filteredUpdates = {};
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredUpdates[field] = updateData[field];
    }
  });

  if (Object.keys(filteredUpdates).length === 0) {
    throw new ApiError(400, 'No valid activity fields provided for update.');
  }

  const updatedActivity = await Activity.findOneAndUpdate(
    { _id: activityId, tripId },
    filteredUpdates,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email avatar');

  return updatedActivity;
};

/**
 * Deletes an activity and re-indexes remaining activities on that day to keep order contiguous.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} activityId - Target activity ID.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
export const deleteActivity = async (tripId, activityId) => {
  const activity = await Activity.findOneAndDelete({ _id: activityId, tripId });
  if (!activity) {
    throw new ApiError(404, 'Activity not found in this trip workspace.');
  }

  // Re-index remaining activities on the deleted activity's dayNumber and itineraryId
  await Activity.updateMany(
    {
      tripId,
      itineraryId: activity.itineraryId,
      dayNumber: activity.dayNumber,
      order: { $gt: activity.order }
    },
    { $inc: { order: -1 } }
  );

  return true;
};

/**
 * Executes high-performance bulk reordering of activities for drag-and-drop operations.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {Array<{activityId: string, dayNumber: number, order: number}>} reorderPayload - Array of reorder specs.
 * @returns {Promise<Array>} Refreshed list of all trip activities.
 */
export const reorderActivities = async (tripId, reorderPayload) => {
  if (!Array.isArray(reorderPayload) || reorderPayload.length === 0) {
    throw new ApiError(400, 'Reorder payload must be a non-empty array.');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Build bulkWrite updateOne operations
  const bulkOps = reorderPayload.map((item) => ({
    updateOne: {
      filter: { _id: item.activityId, tripId },
      update: {
        dayNumber: Number(item.dayNumber),
        order: Number(item.order)
      }
    }
  }));

  const bulkResult = await Activity.bulkWrite(bulkOps);

  // Validate that all items in the reorder payload matched existing activities in this trip
  if (bulkResult.matchedCount !== reorderPayload.length) {
    throw new ApiError(
      400,
      'One or more activity IDs provided for reordering are invalid or do not belong to this trip workspace.'
    );
  }

  // Return full refreshed itinerary activities list
  return getTripActivities(tripId);
};

/**
 * Toggles or explicitly sets the completion status of an activity.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} activityId - Target activity ID.
 * @param {boolean} [isCompleted] - Target state (toggles current state if omitted).
 * @returns {Promise<Object>} Updated activity document.
 */
export const toggleActivityCompletion = async (tripId, activityId, isCompleted) => {
  const activity = await Activity.findOne({ _id: activityId, tripId });
  if (!activity) {
    throw new ApiError(404, 'Activity not found in this trip workspace.');
  }

  activity.isCompleted = isCompleted !== undefined ? Boolean(isCompleted) : !activity.isCompleted;
  await activity.save();

  return activity;
};
