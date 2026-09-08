import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { TripMember } from '../models/TripMember.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notificationService.js';
import { calculateBudgetBreakdown } from '../utils/budgetHelper.js';

/**
 * 🛠️ TripService: Core Business Logic Layer for Trip Management & Workspaces.
 * Decoupled from Express HTTP req/res objects for max reusability & clean testing.
 */

// Default travel essentials pre-populated for new trips
const DEFAULT_PACKING_ITEMS = [
  { item: 'Passport & Identity Documents', category: 'Documents', isPacked: false },
  { item: 'Phone Charger & Power Bank', category: 'Electronics', isPacked: false },
  { item: 'Travel First Aid Kit', category: 'Health', isPacked: false },
  { item: 'Toiletries & Personal Hygiene Kit', category: 'Toiletries', isPacked: false }
];

/**
 * Creates a new Trip document and automatically registers the creator as an accepted OWNER in TripMember.
 * Employs a best-effort manual cleanup rollback if TripMember creation fails.
 * 
 * @param {string} userId - ID of the user creating the trip.
 * @param {Object} tripData - Trip workspace details.
 * @returns {Promise<Object>} Created trip document.
 */
export const createTrip = async (userId, tripData) => {
  const { startDate, endDate } = tripData;

  if (new Date(endDate) < new Date(startDate)) {
    throw new ApiError(400, 'Trip end date cannot be earlier than start date.');
  }

  // Authoritatively calculate budget breakdown using server helper
  const estimatedBudget = Number(tripData?.budget?.estimated) || 0;
  const intercityTransport = Number(tripData?.budget?.reserved?.intercityTransport) || 0;
  const accommodation = Number(tripData?.budget?.reserved?.accommodation) || 0;
  const buffer = Number(tripData?.budget?.reserved?.buffer) || 0;

  const budgetBreakdown = calculateBudgetBreakdown({
    totalBudget: estimatedBudget,
    intercityTransport,
    accommodation,
    buffer
  });

  const budget = {
    estimated: estimatedBudget,
    currency: tripData?.budget?.currency || 'INR',
    reserved: budgetBreakdown.reserved,
    itineraryBudget: budgetBreakdown.itineraryBudget
  };

  // Pre-populate default packing checklist if none supplied
  const packingChecklist =
    tripData.packingChecklist && tripData.packingChecklist.length > 0
      ? tripData.packingChecklist
      : DEFAULT_PACKING_ITEMS;

  let newTrip;
  try {
    // Step 1: Create Trip document with authoritative budget breakdown
    newTrip = await Trip.create({
      ...tripData,
      budget,
      packingChecklist,
      createdBy: userId
    });

    // Step 2: Automatically register creator as accepted OWNER in TripMember junction collection
    await TripMember.create({
      tripId: newTrip._id,
      userId: userId,
      role: 'OWNER',
      inviteStatus: 'ACCEPTED',
      invitedBy: userId,
      acceptedAt: new Date()
    });

    return newTrip;
  } catch (error) {
    // Best-effort manual rollback: If TripMember creation fails, delete orphaned Trip document
    if (newTrip && newTrip._id) {
      await Trip.findByIdAndDelete(newTrip._id);
    }
    throw error instanceof ApiError
      ? error
      : new ApiError(500, `Failed to initialize trip workspace: ${error.message}`);
  }
};

/**
 * Retrieves all trips accessible to a user (both created and invited memberships).
 * 
 * @param {string} userId - Target user ID.
 * @param {string} [statusFilter] - Optional status filter ('PLANNED', 'ONGOING', 'COMPLETED', 'ARCHIVED').
 * @returns {Promise<Array>} Array of accessible trip documents.
 */
export const getUserTrips = async (userId, statusFilter) => {
  // Step 1: Query accepted memberships for user
  const memberships = await TripMember.find({
    userId,
    inviteStatus: 'ACCEPTED'
  }).select('tripId role');

  const tripIds = memberships.map((m) => m.tripId);

  // Step 2: Build query for trips matching IDs
  const query = { _id: { $in: tripIds } };
  if (statusFilter) {
    query.status = statusFilter;
  }

  const trips = await Trip.find(query)
    .populate('createdBy', 'name email avatar')
    .sort({ createdAt: -1 });

  return trips;
};

/**
 * Retrieves trip details by ID along with its list of accepted members.
 * 
 * @param {string} tripId - Target trip ID.
 * @returns {Promise<Object>} Object containing trip details and accepted members list.
 */
export const getTripById = async (tripId) => {
  const trip = await Trip.findById(tripId).populate('createdBy', 'name email avatar');
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const members = await TripMember.find({ tripId, inviteStatus: 'ACCEPTED' })
    .populate('userId', 'name email avatar')
    .sort({ role: 1 });

  return { trip, members };
};

/**
 * Updates trip metadata (dates, budget, title, destination).
 * Validates start/end date consistency and enforces explicit allowlist filtering.
 * Authorization is enforced upstream by checkTripRole middleware.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {Object} updateData - Fields to update.
 * @returns {Promise<Object>} Updated trip document.
 */
export const updateTrip = async (tripId, updateData) => {
  const existingTrip = await Trip.findById(tripId);
  if (!existingTrip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Validate start/end dates against existing document values if only one date is supplied
  const finalStartDate = updateData.startDate ? new Date(updateData.startDate) : existingTrip.startDate;
  const finalEndDate = updateData.endDate ? new Date(updateData.endDate) : existingTrip.endDate;

  if (finalEndDate < finalStartDate) {
    throw new ApiError(400, 'Trip end date cannot be earlier than start date.');
  }

  // Explicit allowlist filtering: prevents modification of createdBy or budget.spent
  const allowedFields = [
    'title',
    'destination',
    'description',
    'startingLocation',
    'startDate',
    'endDate',
    'travelCompanion',
    'budgetType',
    'travelerCount',
    'interests',
    'status',
    'coverImage',
    'packingChecklist'
  ];

  // Normalize packingChecklist items if supplied (ensure packedBy initialized as empty array for new AI items)
  if (updateData.packingChecklist && Array.isArray(updateData.packingChecklist)) {
    updateData.packingChecklist = updateData.packingChecklist.map((item) => ({
      item: typeof item === 'string' ? item : item.item,
      category: item.category || 'General',
      packedBy: Array.isArray(item.packedBy) ? item.packedBy : []
    }));
  }

  const filteredUpdates = {};
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredUpdates[field] = updateData[field];
    }
  });

  // Handle nested budget fields safely without allowing budget.spent modification
  if (updateData.budget) {
    if (updateData.budget.estimated !== undefined) {
      filteredUpdates['budget.estimated'] = updateData.budget.estimated;
    }
    if (updateData.budget.currency !== undefined) {
      filteredUpdates['budget.currency'] = updateData.budget.currency;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new ApiError(400, 'No valid trip fields provided for update.');
  }

  const updatedTrip = await Trip.findByIdAndUpdate(tripId, filteredUpdates, {
    new: true,
    runValidators: true
  });

  return updatedTrip;
};

/**
 * Deletes a trip and cascades deletion to all associated TripMember records.
 * Authorization is enforced upstream by checkTripRole('OWNER') middleware.
 * 
 * @param {string} tripId - Target trip ID.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
export const deleteTrip = async (tripId) => {
  const trip = await Trip.findByIdAndDelete(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Cascade delete associated membership records
  await TripMember.deleteMany({ tripId });

  return true;
};

/**
 * Toggles or updates the packed state of an item for the specific logged-in user in a trip's packing checklist.
 * 
 * @param {string} userId - ID of the authenticated user toggling the item.
 * @param {string} tripId - Target trip ID.
 * @param {string} itemId - Subdocument ID of the packing item.
 * @param {boolean} [isPacked] - Desired packed state for the user (toggles current state if omitted).
 * @returns {Promise<Array>} Updated packing checklist array.
 */
export const togglePackingItem = async (userId, tripId, itemId, isPacked) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const item = trip.packingChecklist.id(itemId);
  if (!item) {
    throw new ApiError(404, 'Packing checklist item not found.');
  }

  if (!Array.isArray(item.packedBy)) {
    item.packedBy = [];
  }

  const userIdStr = userId.toString();
  const alreadyPackedIndex = item.packedBy.findIndex(
    (id) => (id._id || id).toString() === userIdStr
  );

  let targetPacked = isPacked;
  if (targetPacked === undefined) {
    targetPacked = alreadyPackedIndex === -1;
  }

  if (targetPacked) {
    if (alreadyPackedIndex === -1) {
      item.packedBy.push(userId);
    }
  } else {
    if (alreadyPackedIndex !== -1) {
      item.packedBy.splice(alreadyPackedIndex, 1);
    }
  }

  await trip.save();

  return trip.packingChecklist;
};

/**
 * Invites a user to a trip workspace with a specified role ('EDITOR' or 'VIEWER').
 * Creates a PENDING TripMember record (or re-invites a previously DECLINED user).
 * 
 * @param {string} ownerUserId - ID of the owner initiating the invitation.
 * @param {string} tripId - Target trip workspace ID.
 * @param {Object} memberData - Payload containing userEmail, role, and optional inviteMessage.
 * @returns {Promise<Object>} Created/updated pending TripMember document populated with user & inviter details.
 */
export const addTripMember = async (ownerUserId, tripId, { userEmail, role, inviteMessage }) => {
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.trim()) {
    throw new ApiError(400, 'User email is required to invite a collaborator.');
  }

  const assignedRole = role ? role.toUpperCase() : 'VIEWER';
  if (!['EDITOR', 'VIEWER'].includes(assignedRole)) {
    throw new ApiError(400, 'Invalid role. Only EDITOR and VIEWER roles can be assigned via invitation.');
  }

  // Verify target trip workspace exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Find target user by email
  const targetUser = await User.findOne({ email: userEmail.toLowerCase().trim() });
  if (!targetUser) {
    throw new ApiError(404, 'User with this email was not found.');
  }

  // Prevent self-invitation
  if (targetUser._id.toString() === ownerUserId.toString()) {
    throw new ApiError(400, 'You cannot invite yourself to a trip workspace.');
  }

  // Check if target user is already a member of this trip
  const existingMember = await TripMember.findOne({ tripId, userId: targetUser._id });
  if (existingMember) {
    if (existingMember.inviteStatus === 'ACCEPTED') {
      throw new ApiError(400, 'User is already an accepted member of this trip workspace.');
    }
    if (existingMember.inviteStatus === 'PENDING') {
      throw new ApiError(400, 'An invitation is already pending for this user.');
    }
    if (existingMember.inviteStatus === 'DECLINED') {
      // Allow re-inviting a user who previously declined
      existingMember.inviteStatus = 'PENDING';
      existingMember.role = assignedRole;
      existingMember.invitedBy = ownerUserId;
      existingMember.acceptedAt = null;
      existingMember.inviteMessage = inviteMessage ? inviteMessage.trim() : '';
      await existingMember.save();

      return TripMember.findById(existingMember._id)
        .populate('userId', 'name email avatar')
        .populate('invitedBy', 'name email avatar')
        .populate('tripId', 'title destination startDate endDate');
    }
  }

  // Create new pending TripMember document
  const newMember = await TripMember.create({
    tripId,
    userId: targetUser._id,
    role: assignedRole,
    inviteStatus: 'PENDING',
    invitedBy: ownerUserId,
    acceptedAt: null,
    inviteMessage: inviteMessage ? inviteMessage.trim() : ''
  });

  const populatedMember = await TripMember.findById(newMember._id)
    .populate('userId', 'name email avatar')
    .populate('invitedBy', 'name email avatar')
    .populate('tripId', 'title destination startDate endDate');

  // Trigger non-blocking in-app MEMBER_INVITE notification for the invited user
  try {
    await createNotification({
      recipientId: targetUser._id,
      senderId: ownerUserId,
      tripId: trip._id,
      type: 'MEMBER_INVITE',
      title: '📩 New Trip Invitation',
      message: `You have been invited to join the trip workspace "${trip.title}".`,
      actionUrl: '/dashboard'
    });
  } catch (notifErr) {
    console.error('[Notification Error - MEMBER_INVITE]:', notifErr.message);
  }

  return populatedMember;
};

/**
 * Retrieves all pending invitations for the authenticated user.
 * 
 * @param {string} userId - Target user ID.
 * @returns {Promise<Array>} List of pending TripMember documents populated with trip & inviter details.
 */
export const getUserInvitations = async (userId) => {
  const invitations = await TripMember.find({
    userId,
    inviteStatus: 'PENDING'
  })
    .populate('tripId', 'title destination startDate endDate coverImage budget')
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });

  return invitations;
};

/**
 * Accepts a pending trip invitation.
 * 
 * @param {string} membershipId - Target TripMember document ID.
 * @param {string} userId - ID of the accepting user.
 * @returns {Promise<Object>} Updated TripMember document.
 */
export const acceptTripInvitation = async (membershipId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    throw new ApiError(400, 'Invalid membership ID format.');
  }

  const member = await TripMember.findOne({
    _id: membershipId,
    userId,
    inviteStatus: 'PENDING'
  });

  if (!member) {
    throw new ApiError(404, 'Pending trip invitation not found or access denied.');
  }

  member.inviteStatus = 'ACCEPTED';
  member.acceptedAt = new Date();
  await member.save();

  const populated = await TripMember.findById(member._id)
    .populate('tripId', 'title destination createdBy')
    .populate('userId', 'name email avatar')
    .populate('invitedBy', 'name email avatar');

  // Trigger non-blocking in-app MEMBER_ACCEPTED notification for trip owner
  try {
    const tripObj = populated.tripId;
    const acceptingUser = populated.userId;
    const ownerId = tripObj?.createdBy || member.invitedBy;

    if (ownerId && ownerId.toString() !== userId.toString()) {
      await createNotification({
        recipientId: ownerId,
        senderId: userId,
        tripId: tripObj._id,
        type: 'MEMBER_ACCEPTED',
        title: '👥 Trip Invitation Accepted',
        message: `${acceptingUser?.name || acceptingUser?.email || 'A user'} accepted your invitation to join "${tripObj?.title || 'trip'}".`,
        actionUrl: `/dashboard/trip/${tripObj._id}`
      });
    }
  } catch (notifErr) {
    console.error('[Notification Error - MEMBER_ACCEPTED]:', notifErr.message);
  }

  return populated;
};

/**
 * Declines a pending trip invitation.
 * 
 * @param {string} membershipId - Target TripMember document ID.
 * @param {string} userId - ID of the declining user.
 * @returns {Promise<Object>} Updated TripMember document.
 */
export const declineTripInvitation = async (membershipId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    throw new ApiError(400, 'Invalid membership ID format.');
  }

  const member = await TripMember.findOne({
    _id: membershipId,
    userId,
    inviteStatus: 'PENDING'
  });

  if (!member) {
    throw new ApiError(404, 'Pending trip invitation not found or access denied.');
  }

  member.inviteStatus = 'DECLINED';
  await member.save();

  return TripMember.findById(member._id)
    .populate('tripId', 'title destination startDate endDate')
    .populate('invitedBy', 'name email avatar');
};

/**
 * Removes a member from a trip workspace.
 * Only the trip OWNER can remove members, and cannot remove themselves.
 * 
 * @param {string} ownerUserId - ID of the owner initiating removal.
 * @param {string} tripId - Target trip workspace ID.
 * @param {string} memberId - Target TripMember document ID to remove.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
export const removeTripMember = async (ownerUserId, tripId, memberId) => {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(400, 'Invalid member ID format.');
  }

  const member = await TripMember.findOne({ _id: memberId, tripId });
  if (!member) {
    throw new ApiError(404, 'Trip member record not found.');
  }

  // Prevent owner from removing themselves
  if (member.userId.toString() === ownerUserId.toString() || member.role === 'OWNER') {
    throw new ApiError(400, 'Trip owner cannot be removed from workspace.');
  }

  await TripMember.findByIdAndDelete(memberId);
  return true;
};

/**
 * Updates a member's role ('EDITOR' or 'VIEWER') in a trip workspace.
 * Only the trip OWNER can change roles, and cannot change the OWNER role.
 * 
 * @param {string} ownerUserId - ID of the owner initiating role update.
 * @param {string} tripId - Target trip workspace ID.
 * @param {string} memberId - Target TripMember document ID.
 * @param {string} newRole - Desired role ('EDITOR' or 'VIEWER').
 * @returns {Promise<Object>} Updated TripMember document populated with user details.
 */
export const updateTripMemberRole = async (ownerUserId, tripId, memberId, newRole) => {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(400, 'Invalid member ID format.');
  }

  if (!newRole || typeof newRole !== 'string') {
    throw new ApiError(400, 'Role is required.');
  }

  const assignedRole = newRole.trim().toUpperCase();
  if (!['EDITOR', 'VIEWER'].includes(assignedRole)) {
    throw new ApiError(400, 'Invalid role. Role can only be updated to EDITOR or VIEWER.');
  }

  const member = await TripMember.findOne({ _id: memberId, tripId });
  if (!member) {
    throw new ApiError(404, 'Trip member record not found.');
  }

  // Prevent owner from changing their own role or another owner's role
  if (member.userId.toString() === ownerUserId.toString() || member.role === 'OWNER') {
    throw new ApiError(400, 'Trip owner role cannot be modified.');
  }

  member.role = assignedRole;
  await member.save();

  return TripMember.findById(member._id)
    .populate('userId', 'name email avatar')
    .populate('invitedBy', 'name email avatar');
};

