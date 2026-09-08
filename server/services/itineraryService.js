import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { Itinerary } from '../models/Itinerary.js';
import { Activity } from '../models/Activity.js';
import { ApiError } from '../utils/ApiError.js';
import { optimizeScheduleForBudget } from './aiService.js';

/**
 * Helper to execute MongoDB operations in a Mongoose transaction session.
 * Automatically falls back to session-less execution if running on a standalone local MongoDB instance.
 */
const runTransactionSafely = async (transactionCallback) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await transactionCallback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    // If running on a standalone MongoDB without replica set support, fallback safely
    if (
      error.message &&
      (error.message.includes('replica set') ||
        error.message.includes('Transaction numbers are only allowed on a replica set member'))
    ) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      return await transactionCallback(null);
    }
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * 1. Saves a new itinerary candidate and its activities.
 * NOTE: Does NOT set trip.activeItinerary. The candidate remains un-activated
 * until the user explicitly selects it via PATCH /activate.
 */
export const saveItineraryCandidate = async (userId, tripId, itineraryPayload) => {
  const { title, source, activities } = itineraryPayload;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new ApiError(400, 'Itinerary title is required.');
  }

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new ApiError(400, 'At least one activity is required to save an itinerary candidate.');
  }

  return await runTransactionSafely(async (session) => {
    const sessionOption = session ? { session } : {};

    // Step 1: Verify trip exists
    const trip = await Trip.findById(tripId, null, sessionOption);
    if (!trip) {
      throw new ApiError(404, 'Trip workspace not found.');
    }

    // Read target itinerary budget (using itineraryBudget with fallback to estimated for legacy trips)
    const targetBudget =
      trip.budget?.itineraryBudget !== undefined && trip.budget?.itineraryBudget !== null
        ? Number(trip.budget.itineraryBudget)
        : Number(trip.budget?.estimated) || 0;

    // Helper to calculate backend sum of all Activity.estimatedCost values
    const computeTotalCost = (acts) =>
      acts.reduce((sum, act) => {
        const cost = Number(act.estimatedCost);
        return sum + (Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0);
      }, 0);

    let activitiesToProcess = activities;
    let totalActivityCost = computeTotalCost(activitiesToProcess);

    // Enforce itinerary budget: trigger AI budget re-optimization if total cost > targetBudget
    if (totalActivityCost > targetBudget) {
      try {
        const optimized = await optimizeScheduleForBudget(
          activitiesToProcess,
          targetBudget,
          totalActivityCost
        );

        if (!Array.isArray(optimized) || optimized.length === 0) {
          throw new ApiError(400, 'Unable to fit itinerary within the available itinerary budget.');
        }

        const optimizedTotalCost = computeTotalCost(optimized);

        // Never trust Gemini's claimed total: verify backend-calculated optimized total <= targetBudget
        if (optimizedTotalCost > targetBudget) {
          throw new ApiError(400, 'Unable to fit itinerary within the available itinerary budget.');
        }

        activitiesToProcess = optimized;
      } catch (optErr) {
        throw optErr instanceof ApiError
          ? optErr
          : new ApiError(400, 'Unable to fit itinerary within the available itinerary budget.');
      }
    }

    // Step 2: Create Itinerary candidate document
    const [newItinerary] = await Itinerary.create(
      [
        {
          tripId,
          title: title.trim(),
          source: ['AI_GENERATED', 'MANUAL'].includes(source) ? source : 'AI_GENERATED',
          createdBy: userId
        }
      ],
      sessionOption
    );

    // Helper to parse "HH:mm" time string into minutes from midnight for robust chronological comparison
    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return 0;
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours * 60 + minutes;
    };

    // Step 3: Group activities by dayNumber, sort by time asc, and assign order index
    const activitiesByDay = {};
    activitiesToProcess.forEach((act) => {
      const dayNum = Number(act.dayNumber) || 1;
      if (!activitiesByDay[dayNum]) {
        activitiesByDay[dayNum] = [];
      }
      activitiesByDay[dayNum].push(act);
    });

    const activitiesToCreate = [];
    Object.keys(activitiesByDay).forEach((dayStr) => {
      const dayNum = Number(dayStr);
      const dayList = activitiesByDay[dayStr];
      dayList.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

      dayList.forEach((act, idx) => {
        activitiesToCreate.push({
          tripId,
          itineraryId: newItinerary._id,
          dayNumber: dayNum,
          order: idx,
          time: act.time || '09:00',
          title: act.title,
          description: act.description || '',
          location: {
            name: act.locationName || act.location?.name || ''
          },
          estimatedCost: Number(act.estimatedCost) || 0,
          estimatedDurationMinutes: Number(act.estimatedDurationMinutes) || 60,
          createdBy: userId
        });
      });
    });

    const createdActivities = await Activity.create(activitiesToCreate, sessionOption);

    // Auto-activate newly saved candidate ONLY if the trip currently has no active itinerary
    let isActive = false;
    if (!trip.activeItinerary) {
      trip.activeItinerary = newItinerary._id;
      await trip.save(sessionOption);
      isActive = true;
      console.log(`[ItineraryService] Automatically set initial itinerary "${newItinerary.title}" (ID: ${newItinerary._id}) as active itinerary for trip ${tripId}.`);
    }

    return {
      itinerary: {
        ...newItinerary.toObject(),
        isActive
      },
      activities: createdActivities
    };
  });
};

/**
 * 2. Lists all itinerary candidates for a trip.
 * Calculates isActive, activityCount, and totalEstimatedCost for each candidate.
 */
export const listItineraryCandidates = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const itineraries = await Itinerary.find({ tripId }).sort({ createdAt: -1 });

  const activeItineraryId = trip.activeItinerary ? trip.activeItinerary.toString() : null;

  // Calculate metrics for each itinerary candidate using BOTH tripId AND itineraryId
  const candidatesWithMetrics = await Promise.all(
    itineraries.map(async (itinerary) => {
      const activities = await Activity.find({ tripId, itineraryId: itinerary._id }).select('estimatedCost');

      const activityCount = activities.length;
      const totalEstimatedCost = activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );

      return {
        _id: itinerary._id,
        tripId: itinerary.tripId,
        title: itinerary.title,
        source: itinerary.source,
        createdAt: itinerary.createdAt,
        updatedAt: itinerary.updatedAt,
        isActive: activeItineraryId ? itinerary._id.toString() === activeItineraryId : false,
        activityCount,
        totalEstimatedCost
      };
    })
  );

  return candidatesWithMetrics;
};

/**
 * 3. Retrieves details and activities for a single specific itinerary candidate.
 */
export const getItineraryCandidateById = async (tripId, itineraryId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const itinerary = await Itinerary.findOne({ _id: itineraryId, tripId });
  if (!itinerary) {
    throw new ApiError(404, 'Itinerary candidate not found in this trip workspace.');
  }

  // Activity query strictly scoped by BOTH tripId AND itineraryId
  const activities = await Activity.find({ tripId, itineraryId: itinerary._id })
    .populate('createdBy', 'name email avatar')
    .sort({ dayNumber: 1, order: 1, time: 1 });

  console.log(`[ItineraryService] Fetched candidate ${itineraryId} for trip ${tripId}: found ${activities.length} activities.`);

  const activeItineraryId = trip.activeItinerary ? trip.activeItinerary.toString() : null;

  return {
    itinerary: {
      ...itinerary.toObject(),
      isActive: activeItineraryId ? itinerary._id.toString() === activeItineraryId : false
    },
    activities
  };
};

/**
 * 4. Activates a selected itinerary as the FINAL active itinerary.
 * ATOMIC TRANSACTION:
 * - Makes selected itinerary active on trip.
 * - Deletes all OTHER itinerary candidates for this trip.
 * - Deletes all activities belonging to discarded itineraries.
 * - Keeps selected itinerary and its activities intact.
 */
export const activateItineraryCandidate = async (userId, tripId, itineraryId) => {
  return await runTransactionSafely(async (session) => {
    const sessionOption = session ? { session } : {};

    // Step 1: Verify trip exists
    const trip = await Trip.findById(tripId, null, sessionOption);
    if (!trip) {
      throw new ApiError(404, 'Trip workspace not found.');
    }

    // Step 2: Verify selected itinerary exists and belongs to trip
    const selectedItinerary = await Itinerary.findOne(
      { _id: itineraryId, tripId },
      null,
      sessionOption
    );
    if (!selectedItinerary) {
      throw new ApiError(404, 'Selected itinerary candidate not found in this trip.');
    }

    // Step 3: Find all OTHER itinerary candidates for this trip
    const otherItineraries = await Itinerary.find(
      { tripId, _id: { $ne: selectedItinerary._id } },
      '_id',
      sessionOption
    );
    const otherItineraryIds = otherItineraries.map((item) => item._id);

    // Step 4: Delete all activities belonging to discarded candidates
    if (otherItineraryIds.length > 0) {
      await Activity.deleteMany(
        { itineraryId: { $in: otherItineraryIds } },
        sessionOption
      );

      // Step 5: Delete discarded itinerary documents
      await Itinerary.deleteMany(
        { _id: { $in: otherItineraryIds } },
        sessionOption
      );
    }

    // Step 6: Mark selected itinerary as the trip's activeItinerary
    trip.activeItinerary = selectedItinerary._id;
    await trip.save(sessionOption);

    // Step 7: Retrieve selected itinerary activities to return
    const activeActivities = await Activity.find(
      { itineraryId: selectedItinerary._id },
      null,
      sessionOption
    ).sort({ dayNumber: 1, order: 1, time: 1 });

    return {
      itinerary: {
        ...selectedItinerary.toObject(),
        isActive: true
      },
      activities: activeActivities
    };
  });
};

/**
 * 5. Deletes an unselected itinerary candidate and its activities.
 * Blocks deletion if the candidate is the currently active itinerary.
 */
export const deleteItineraryCandidate = async (tripId, itineraryId) => {
  return await runTransactionSafely(async (session) => {
    const sessionOption = session ? { session } : {};

    const trip = await Trip.findById(tripId, null, sessionOption);
    if (!trip) {
      throw new ApiError(404, 'Trip workspace not found.');
    }

    const itinerary = await Itinerary.findOne(
      { _id: itineraryId, tripId },
      null,
      sessionOption
    );
    if (!itinerary) {
      throw new ApiError(404, 'Itinerary candidate not found in this trip.');
    }

    if (trip.activeItinerary && trip.activeItinerary.toString() === itineraryId.toString()) {
      throw new ApiError(
        400,
        'Cannot delete the active itinerary. Select another itinerary first.'
      );
    }

    // Cascade delete activities belonging to this candidate
    await Activity.deleteMany({ itineraryId: itinerary._id }, sessionOption);

    // Delete candidate itinerary document
    await Itinerary.deleteOne({ _id: itinerary._id }, sessionOption);

    return true;
  });
};

/**
 * Resets a trip's itinerary state for testing / cleanup:
 * Sets trip.activeItinerary = null, deletes all Itinerary and Activity documents for that trip.
 */
export const resetTripItineraries = async (tripId) => {
  return await runTransactionSafely(async (session) => {
    const sessionOption = session ? { session } : {};

    const trip = await Trip.findById(tripId, null, sessionOption);
    if (!trip) {
      throw new ApiError(404, 'Trip workspace not found.');
    }

    trip.activeItinerary = null;
    await trip.save(sessionOption);

    await Activity.deleteMany({ tripId }, sessionOption);
    await Itinerary.deleteMany({ tripId }, sessionOption);

    return true;
  });
};

/**
 * Startup Migration: Upgrades legacy Activity documents that lack an itineraryId.
 */
export const migrateExistingActivities = async () => {
  try {
    const unmigratedActivities = await Activity.find({
      $or: [{ itineraryId: { $exists: false } }, { itineraryId: null }]
    });

    if (unmigratedActivities.length === 0) {
      return;
    }

    console.log(`[Migration] Found ${unmigratedActivities.length} legacy activities without itineraryId. Migrating...`);

    const activitiesByTrip = {};
    unmigratedActivities.forEach((act) => {
      const tId = act.tripId.toString();
      if (!activitiesByTrip[tId]) {
        activitiesByTrip[tId] = [];
      }
      activitiesByTrip[tId].push(act);
    });

    for (const tripIdStr of Object.keys(activitiesByTrip)) {
      const trip = await Trip.findById(tripIdStr);
      if (!trip) continue;

      let defaultItinerary;
      if (trip.activeItinerary) {
        defaultItinerary = await Itinerary.findById(trip.activeItinerary);
      }

      if (!defaultItinerary) {
        defaultItinerary = await Itinerary.create({
          tripId: trip._id,
          title: 'Initial Plan',
          source: 'MANUAL',
          createdBy: trip.createdBy
        });
        // Note: activeItinerary is not set automatically
      }

      await Activity.updateMany(
        { tripId: trip._id, $or: [{ itineraryId: { $exists: false } }, { itineraryId: null }] },
        { itineraryId: defaultItinerary._id }
      );
    }

    console.log(`[Migration] Successfully completed itinerary migration for legacy activities.`);
  } catch (error) {
    console.error(`[Migration] Warning: Activity migration encountered an error: ${error.message}`);
  }
};

/**
 * 6. Compares two itinerary candidates side-by-side.
 * Returns metadata and activities array for both selected candidates.
 */
export const compareItineraryCandidates = async (tripId, versionIdsStr) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const ids = (versionIdsStr || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length !== 2) {
    throw new ApiError(400, 'Exactly two itinerary candidate IDs are required for comparison.');
  }

  const activeItineraryId = trip.activeItinerary ? trip.activeItinerary.toString() : null;

  const comparisonData = await Promise.all(
    ids.map(async (itineraryId) => {
      const itinerary = await Itinerary.findOne({ _id: itineraryId, tripId });
      if (!itinerary) {
        throw new ApiError(404, `Itinerary candidate ${itineraryId} not found in this trip.`);
      }

      const activities = await Activity.find({ tripId, itineraryId: itinerary._id })
        .populate('createdBy', 'name email avatar')
        .sort({ dayNumber: 1, order: 1, time: 1 });

      console.log(`[ItineraryService] Compare candidate ${itineraryId} for trip ${tripId}: found ${activities.length} activities.`);

      const activityCount = activities.length;
      const totalEstimatedCost = activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );

      return {
        itinerary: {
          ...itinerary.toObject(),
          isActive: activeItineraryId ? itinerary._id.toString() === activeItineraryId : false,
          activityCount,
          totalEstimatedCost
        },
        activities
      };
    })
  );

  return comparisonData;
};
