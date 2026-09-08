import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Settlement } from '../models/Settlement.js';
import { Trip } from '../models/Trip.js';
import { TripMember } from '../models/TripMember.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notificationService.js';

/**
 * 🛠️ ExpenseService: Core Business Logic Layer for Expense Tracking & Financial Analytics.
 * Handles expense CRUD, automated Trip.budget.spent synchronization, category breakdowns,
 * and Splitwise-style balance calculations.
 */

/**
 * Helper to determine budget state ('UNDER', 'WARNING', 'EXCEEDED').
 */
const getBudgetState = (spentAmount, estimatedAmount) => {
  if (!estimatedAmount || estimatedAmount <= 0) return 'UNDER';
  const ratio = spentAmount / estimatedAmount;
  if (ratio >= 1.0) return 'EXCEEDED';
  if (ratio >= 0.8) return 'WARNING';
  return 'UNDER';
};

/**
 * Internal helper to recalculate total spent for a trip and sync with Trip.budget.spent.
 * Uses MongoDB Aggregation for atomic ground-truth summation.
 * Triggers state-transition-based BUDGET_WARNING notifications.
 * 
 * @param {string} tripId - Target trip ID.
 * @returns {Promise<number>} Updated total spent amount.
 */
export const recalculateTripSpent = async (tripId) => {
  // Capture previous trip budget spending & estimated budget before update
  const previousTrip = await Trip.findById(tripId);
  const oldSpent = previousTrip?.budget?.spent || 0;
  const estimated = previousTrip?.budget?.estimated || 0;

  const result = await Expense.aggregate([
    { $match: { tripId: new mongoose.Types.ObjectId(tripId) } },
    { $group: { _id: '$tripId', totalSpent: { $sum: '$amount' } } }
  ]);

  const totalSpent = result.length > 0 ? result[0].totalSpent : 0;

  const trip = await Trip.findByIdAndUpdate(
    tripId,
    { 'budget.spent': totalSpent },
    { new: true }
  );

  // Trigger non-blocking in-app BUDGET_WARNING notifications on state transitions
  try {
    if (estimated > 0 && trip) {
      const oldState = getBudgetState(oldSpent, estimated);
      const newState = getBudgetState(totalSpent, estimated);

      // State transition checks for entering higher threshold states
      const isEnteringWarning = oldState === 'UNDER' && newState === 'WARNING';
      const isEnteringExceeded = (oldState === 'UNDER' || oldState === 'WARNING') && newState === 'EXCEEDED';

      if (isEnteringWarning || isEnteringExceeded) {
        // Collect all accepted workspace members + owner
        const acceptedMembers = await TripMember.find({ tripId, inviteStatus: 'ACCEPTED' });
        const recipientUserIds = new Set();
        if (trip.createdBy) recipientUserIds.add(trip.createdBy.toString());
        acceptedMembers.forEach((m) => {
          if (m.userId) recipientUserIds.add(m.userId.toString());
        });

        const isOverBudget = newState === 'EXCEEDED';
        const title = isOverBudget ? '⚠️ Trip Budget Exceeded' : '💰 Budget Threshold Warning';
        const ratio = totalSpent / estimated;
        const message = isOverBudget
          ? `Total spent (₹${totalSpent.toLocaleString('en-IN')}) has exceeded the estimated budget (₹${estimated.toLocaleString('en-IN')}) for "${trip.title}".`
          : `Your trip "${trip.title}" has reached ${Math.round(ratio * 100)}% of its estimated budget (₹${totalSpent.toLocaleString('en-IN')} / ₹${estimated.toLocaleString('en-IN')}).`;

        for (const recipientId of recipientUserIds) {
          await createNotification({
            recipientId,
            senderId: null,
            tripId: trip._id,
            type: 'BUDGET_WARNING',
            title,
            message,
            actionUrl: `/dashboard/trip/${trip._id}/expenses`
          });
        }
      }
    }
  } catch (notifErr) {
    console.error('[Notification Error - BUDGET_WARNING]:', notifErr.message);
  }

  return totalSpent;
};

/**
 * Helper to fetch all accepted workspace member user IDs (including trip creator/owner).
 */
const getAcceptedMemberUserIds = async (tripId, trip) => {
  const acceptedMembers = await TripMember.find({ tripId, inviteStatus: 'ACCEPTED' }).select('userId');
  const memberIds = new Set(acceptedMembers.map((m) => m.userId?.toString()).filter(Boolean));
  if (trip?.createdBy) {
    memberIds.add((trip.createdBy._id || trip.createdBy).toString());
  }
  return memberIds;
};

/**
 * Validates paidBy user and processes splitDetails (auto-calculates EQUAL split shares or validates CUSTOM splits).
 * Guarantees split amounts sum exactly to expense amount using integer cent remainder distribution.
 */
const processExpenseSplits = async (tripId, trip, amount, splitDetails, paidBy) => {
  const numAmount = Number(amount) || 0;
  if (numAmount < 0) {
    throw new ApiError(400, 'Expense amount cannot be negative.');
  }

  const memberIds = await getAcceptedMemberUserIds(tripId, trip);

  // Validate paidBy user
  if (!paidBy || !mongoose.Types.ObjectId.isValid(paidBy)) {
    throw new ApiError(400, 'Valid payer user ID is required.');
  }

  const paidByStr = paidBy.toString();
  if (!memberIds.has(paidByStr)) {
    throw new ApiError(400, 'Expense payer must be an accepted member of this trip workspace.');
  }

  const splitType = splitDetails?.splitType ? splitDetails.splitType.toUpperCase() : 'EQUAL';

  if (splitType === 'CUSTOM') {
    if (!splitDetails || !Array.isArray(splitDetails.splits) || splitDetails.splits.length === 0) {
      throw new ApiError(400, 'Custom splits array is required for CUSTOM split type.');
    }

    const totalCents = Math.round(numAmount * 100);
    let customSumCents = 0;
    const validatedSplits = [];

    for (const s of splitDetails.splits) {
      const uId = (s?.userId?._id || s?.userId)?.toString();
      if (!uId || !mongoose.Types.ObjectId.isValid(uId)) {
        throw new ApiError(400, 'Invalid participant user ID in custom splits.');
      }
      if (!memberIds.has(uId)) {
        throw new ApiError(400, 'All split participants must be accepted members of this trip workspace.');
      }
      const sAmount = Number(s.amount) || 0;
      if (sAmount < 0) {
        throw new ApiError(400, 'Custom split amount cannot be negative.');
      }
      const sCents = Math.round(sAmount * 100);
      customSumCents += sCents;
      validatedSplits.push({
        userId: new mongoose.Types.ObjectId(uId),
        amount: Number((sCents / 100).toFixed(2))
      });
    }

    if (customSumCents !== totalCents) {
      throw new ApiError(400, 'Sum of custom split amounts must equal total expense amount.');
    }

    return {
      paidBy: new mongoose.Types.ObjectId(paidByStr),
      splitDetails: {
        splitType: 'CUSTOM',
        splits: validatedSplits
      }
    };
  }

  // Handle EQUAL splitting
  let rawParticipants = [];
  if (Array.isArray(splitDetails?.participants)) {
    rawParticipants = splitDetails.participants;
  } else if (Array.isArray(splitDetails?.splits)) {
    rawParticipants = splitDetails.splits.map((s) => (s?.userId ? s.userId : s));
  }

  let participantUserIds = [];
  if (rawParticipants.length > 0) {
    participantUserIds = rawParticipants.map((p) => (typeof p === 'object' && p._id ? p._id.toString() : p.toString()));
  } else {
    // Default to all accepted workspace members if no participants array specified
    participantUserIds = Array.from(memberIds);
  }

  const uniqueParticipantIds = [];
  const seen = new Set();

  for (const pid of participantUserIds) {
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      throw new ApiError(400, `Invalid participant user ID format: ${pid}`);
    }
    const pStr = pid.toString();
    if (seen.has(pStr)) {
      throw new ApiError(400, 'Duplicate participant IDs are not allowed in expense split.');
    }
    if (!memberIds.has(pStr)) {
      throw new ApiError(400, 'All expense participants must be accepted members of this trip workspace.');
    }
    seen.add(pStr);
    uniqueParticipantIds.push(pStr);
  }

  if (uniqueParticipantIds.length === 0) {
    throw new ApiError(400, 'At least one valid participant is required for equal expense splitting.');
  }

  // Integer-cent division with remainder distribution for exact ground-truth summation
  const totalCents = Math.round(numAmount * 100);
  const N = uniqueParticipantIds.length;
  const baseCents = Math.floor(totalCents / N);
  const remainderCents = totalCents % N;

  const equalSplits = uniqueParticipantIds.map((pId, index) => {
    const itemCents = baseCents + (index < remainderCents ? 1 : 0);
    return {
      userId: new mongoose.Types.ObjectId(pId),
      amount: Number((itemCents / 100).toFixed(2))
    };
  });

  return {
    paidBy: new mongoose.Types.ObjectId(paidByStr),
    splitDetails: {
      splitType: 'EQUAL',
      splits: equalSplits
    }
  };
};

/**
 * Creates a new expense entry and synchronizes total trip budget spent.
 * 
 * @param {string} userId - User creating the expense.
 * @param {string} tripId - Target trip ID.
 * @param {Object} expenseData - Expense creation payload.
 * @returns {Promise<Object>} Created expense document populated with user info.
 */
export const createExpense = async (userId, tripId, expenseData) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // Default paidBy to creator if not explicitly specified
  const paidBy = expenseData.paidBy || userId;

  const processed = await processExpenseSplits(
    tripId,
    trip,
    expenseData.amount,
    expenseData.splitDetails,
    paidBy
  );

  const expense = await Expense.create({
    ...expenseData,
    tripId,
    paidBy: processed.paidBy,
    splitDetails: processed.splitDetails,
    createdBy: userId
  });

  // Sync total spent on trip document
  await recalculateTripSpent(tripId);

  const populatedExpense = await Expense.findById(expense._id)
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('splitDetails.splits.userId', 'name email avatar');

  return populatedExpense;
};

/**
 * Retrieves all expenses for a trip workspace with optional category filter.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} [categoryFilter] - Optional category filter (e.g. 'FOOD', 'HOTEL').
 * @returns {Promise<Array>} List of expense documents.
 */
export const getTripExpenses = async (tripId, categoryFilter) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const query = { tripId };
  if (categoryFilter && categoryFilter.trim() !== '') {
    query.category = categoryFilter.trim().toUpperCase();
  }

  const expenses = await Expense.find(query)
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('splitDetails.splits.userId', 'name email avatar')
    .sort({ expenseDate: -1, createdAt: -1 });

  return expenses;
};

/**
 * Fetches details for a specific expense, ensuring trip workspace scoping.
 * 
 * @param {string} tripId - Target trip ID.
 * @param {string} expenseId - Target expense ID.
 * @returns {Promise<Object>} Expense document.
 */
export const getExpenseById = async (tripId, expenseId) => {
  const expense = await Expense.findOne({ _id: expenseId, tripId })
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('splitDetails.splits.userId', 'name email avatar');

  if (!expense) {
    throw new ApiError(404, 'Expense record not found in this trip workspace.');
  }

  return expense;
};

/**
 * Updates expense details with explicit field allowlist filtering and recalculates total spent.
 * 
 * @param {string} userId - Authenticated user ID.
 * @param {string} userRole - User's trip role ('OWNER', 'EDITOR', 'VIEWER').
 * @param {string} tripId - Target trip ID.
 * @param {string} expenseId - Target expense ID.
 * @param {Object} updateData - Update payload.
 * @returns {Promise<Object>} Updated expense document.
 */
export const updateExpense = async (userId, userRole, tripId, expenseId, updateData) => {
  const existingExpense = await Expense.findOne({ _id: expenseId, tripId });
  if (!existingExpense) {
    throw new ApiError(404, 'Expense record not found in this trip workspace.');
  }

  // Ownership check: OWNER can edit any expense; EDITOR and VIEWER can only edit expenses created by or paid by themselves
  if (userRole !== 'OWNER') {
    const createdById = (existingExpense.createdBy?._id || existingExpense.createdBy)?.toString();
    const paidById = (existingExpense.paidBy?._id || existingExpense.paidBy)?.toString();
    const currentUserId = userId.toString();

    const isCreator = createdById && createdById === currentUserId;
    const isPayer = paidById && paidById === currentUserId;

    if (!isCreator && !isPayer) {
      throw new ApiError(
        403,
        `Forbidden: ${userRole === 'EDITOR' ? 'Editors' : 'Viewers'} can only edit expenses created by or paid by themselves.`
      );
    }
  }

  const allowedFields = [
    'title',
    'amount',
    'category',
    'paidBy',
    'splitDetails',
    'expenseDate',
    'receipt'
  ];

  const filteredUpdates = {};
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredUpdates[field] = updateData[field];
    }
  });

  if (Object.keys(filteredUpdates).length === 0) {
    throw new ApiError(400, 'No valid expense fields provided for update.');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const finalAmount = filteredUpdates.amount !== undefined ? filteredUpdates.amount : existingExpense.amount;
  const finalPaidBy = filteredUpdates.paidBy !== undefined ? filteredUpdates.paidBy : existingExpense.paidBy;
  const finalSplitDetails = filteredUpdates.splitDetails !== undefined ? filteredUpdates.splitDetails : existingExpense.splitDetails;

  const processed = await processExpenseSplits(
    tripId,
    trip,
    finalAmount,
    finalSplitDetails,
    finalPaidBy
  );

  filteredUpdates.paidBy = processed.paidBy;
  filteredUpdates.splitDetails = processed.splitDetails;

  const updatedExpense = await Expense.findOneAndUpdate(
    { _id: expenseId, tripId },
    filteredUpdates,
    { new: true, runValidators: true }
  )
    .populate('paidBy', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('splitDetails.splits.userId', 'name email avatar');

  // Sync total spent on trip document
  await recalculateTripSpent(tripId);

  return updatedExpense;
};

/**
 * Deletes an expense entry and recalculates total spent on the trip.
 * 
 * @param {string} userId - Authenticated user ID.
 * @param {string} userRole - User's trip role ('OWNER', 'EDITOR', 'VIEWER').
 * @param {string} tripId - Target trip ID.
 * @param {string} expenseId - Target expense ID.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
export const deleteExpense = async (userId, userRole, tripId, expenseId) => {
  const existingExpense = await Expense.findOne({ _id: expenseId, tripId });
  if (!existingExpense) {
    throw new ApiError(404, 'Expense record not found in this trip workspace.');
  }

  // Ownership check: OWNER can delete any expense; EDITOR and VIEWER can only delete expenses created by or paid by themselves
  if (userRole !== 'OWNER') {
    const createdById = (existingExpense.createdBy?._id || existingExpense.createdBy)?.toString();
    const paidById = (existingExpense.paidBy?._id || existingExpense.paidBy)?.toString();
    const currentUserId = userId.toString();

    const isCreator = createdById && createdById === currentUserId;
    const isPayer = paidById && paidById === currentUserId;

    if (!isCreator && !isPayer) {
      throw new ApiError(
        403,
        `Forbidden: ${userRole === 'EDITOR' ? 'Editors' : 'Viewers'} can only delete expenses created by or paid by themselves.`
      );
    }
  }

  await Expense.findByIdAndDelete(expenseId);

  // Sync total spent on trip document
  await recalculateTripSpent(tripId);

  return true;
};

/**
 * Aggregates financial analytics, category breakdowns for Recharts, and overall budget status.
 * 
 * @param {string} tripId - Target trip ID.
 * @returns {Promise<Object>} Analytics summary object.
 */
export const getExpenseAnalytics = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  // 1. Aggregation for category breakdowns
  const categoryAggregation = await Expense.aggregate([
    { $match: { tripId: new mongoose.Types.ObjectId(tripId) } },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  const totalSpent = categoryAggregation.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const estimatedBudget = trip.budget.estimated || 0;
  const remainingBudget = Math.max(0, estimatedBudget - totalSpent);
  const isOverBudget = totalSpent > estimatedBudget;

  // Format category breakdown with percentage for Recharts frontend visualizations
  const categoryBreakdown = categoryAggregation.map((item) => ({
    category: item._id,
    totalAmount: item.totalAmount,
    count: item.count,
    percentage: totalSpent > 0 ? Number(((item.totalAmount / totalSpent) * 100).toFixed(1)) : 0
  }));

  // 2. Fetch all expenses to calculate Splitwise-style net member balances
  const allExpenses = await Expense.find({ tripId })
    .populate('paidBy', 'name email avatar')
    .populate('splitDetails.splits.userId', 'name email avatar');

  // Track net balance per user ID: positive = owed money, negative = owes money
  const balancesMap = {};
  const userMap = {}; // Cache user info

  allExpenses.forEach((exp) => {
    const payerId = exp.paidBy._id.toString();
    userMap[payerId] = exp.paidBy;

    if (!balancesMap[payerId]) balancesMap[payerId] = 0;
    balancesMap[payerId] += exp.amount;

    if (exp.splitDetails && Array.isArray(exp.splitDetails.splits)) {
      exp.splitDetails.splits.forEach((split) => {
        if (split.userId && split.userId._id) {
          const participantId = split.userId._id.toString();
          userMap[participantId] = split.userId;

          if (!balancesMap[participantId]) balancesMap[participantId] = 0;
          balancesMap[participantId] -= split.amount || 0;
        }
      });
    }
  });

  // 3. Fetch persisted Settlement records and apply repayment adjustments
  const allSettlements = await Settlement.find({ tripId })
    .populate('fromUser', 'name email avatar')
    .populate('toUser', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ settledDate: -1, createdAt: -1 });

  allSettlements.forEach((s) => {
    const debtorId = (s.fromUser._id || s.fromUser).toString();
    const creditorId = (s.toUser._id || s.toUser).toString();

    if (s.fromUser && s.fromUser._id) userMap[debtorId] = s.fromUser;
    if (s.toUser && s.toUser._id) userMap[creditorId] = s.toUser;

    if (!balancesMap[debtorId]) balancesMap[debtorId] = 0;
    if (!balancesMap[creditorId]) balancesMap[creditorId] = 0;

    // Debtor paid creditor: debtor net balance increases (+), creditor net balance decreases (-)
    balancesMap[debtorId] += s.amount;
    balancesMap[creditorId] -= s.amount;
  });

  // Build member balances array
  const memberBalances = Object.keys(balancesMap).map((uId) => ({
    user: userMap[uId] || { _id: uId },
    netBalance: Number(balancesMap[uId].toFixed(2)),
    status: balancesMap[uId] > 0.009 ? 'OWED' : balancesMap[uId] < -0.009 ? 'OWES' : 'SETTLED'
  }));

  // 4. Generate minimal outstanding settlement transactions (who still owes whom)
  const debtors = [];
  const creditors = [];

  Object.keys(balancesMap).forEach((uId) => {
    const val = Number(balancesMap[uId].toFixed(2));
    if (val < -0.01) {
      debtors.push({ userId: uId, amount: Math.abs(val) });
    } else if (val > 0.01) {
      creditors.push({ userId: uId, amount: val });
    }
  });

  const settlements = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    if (settlementAmount > 0) {
      settlements.push({
        fromUser: userMap[debtor.userId] || { _id: debtor.userId },
        toUser: userMap[creditor.userId] || { _id: creditor.userId },
        amount: Number(settlementAmount.toFixed(2))
      });

      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;
    }

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  // 5. Build settlementHistory response array from persisted Settlement documents
  const settlementHistory = allSettlements.map((s) => ({
    _id: s._id,
    fromUser: s.fromUser,
    toUser: s.toUser,
    amount: s.amount,
    settledDate: s.settledDate,
    createdBy: s.createdBy
  }));

  return {
    summary: {
      estimatedBudget,
      totalSpent,
      remainingBudget,
      currency: trip.budget.currency || 'INR',
      isOverBudget,
      overBudgetAmount: isOverBudget ? totalSpent - estimatedBudget : 0
    },
    categoryBreakdown,
    memberBalances,
    settlements,
    settlementHistory
  };
};

/**
 * Creates a new settlement record representing an inter-member repayment.
 * Does NOT modify any Expense documents or Trip.budget.spent.
 * 
 * @param {string} userId - ID of user recording settlement.
 * @param {string} tripId - Target trip ID.
 * @param {Object} settlementData - Payload containing fromUser, toUser, amount.
 * @returns {Promise<Object>} Created settlement document populated with user details.
 */
export const createSettlement = async (userId, tripId, settlementData) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, 'Trip workspace not found.');
  }

  const { fromUser, toUser, amount } = settlementData || {};

  if (!fromUser || !mongoose.Types.ObjectId.isValid(fromUser) || !toUser || !mongoose.Types.ObjectId.isValid(toUser)) {
    throw new ApiError(400, 'Valid debtor (fromUser) and creditor (toUser) user IDs are required.');
  }

  const fromUserStr = fromUser.toString();
  const toUserStr = toUser.toString();

  if (fromUserStr === toUserStr) {
    throw new ApiError(400, 'Debtor and creditor cannot be the same user.');
  }

  const memberIds = await getAcceptedMemberUserIds(tripId, trip);
  if (!memberIds.has(fromUserStr) || !memberIds.has(toUserStr)) {
    throw new ApiError(400, 'Both debtor and creditor must be accepted members of this trip workspace.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    throw new ApiError(400, 'Settlement amount must be a valid positive number greater than 0.');
  }

  const roundedAmount = Number(numAmount.toFixed(2));
  if (roundedAmount <= 0) {
    throw new ApiError(400, 'Settlement amount must be greater than zero.');
  }

  // Verify settlement amount does not exceed currently outstanding debt from fromUser to toUser
  const currentAnalytics = await getExpenseAnalytics(tripId);
  const currentOutstanding = currentAnalytics.settlements.find(
    (s) => (s.fromUser._id || s.fromUser).toString() === fromUserStr &&
           (s.toUser._id || s.toUser).toString() === toUserStr
  );

  const maxAllowed = currentOutstanding ? currentOutstanding.amount : 0;
  if (roundedAmount > maxAllowed + 0.001) {
    throw new ApiError(
      400,
      maxAllowed > 0
        ? `Settlement amount (₹${roundedAmount}) exceeds current outstanding debt (₹${maxAllowed}) from debtor to creditor.`
        : `No outstanding debt found from debtor to creditor.`
    );
  }

  const settlement = await Settlement.create({
    tripId,
    fromUser: new mongoose.Types.ObjectId(fromUserStr),
    toUser: new mongoose.Types.ObjectId(toUserStr),
    amount: roundedAmount,
    createdBy: userId
  });

  const populatedSettlement = await Settlement.findById(settlement._id)
    .populate('fromUser', 'name email avatar')
    .populate('toUser', 'name email avatar')
    .populate('createdBy', 'name email avatar');

  return populatedSettlement;
};

/**
 * Deletes a recorded settlement record and restores the original outstanding debt.
 * Does NOT modify any Expense documents or Trip.budget.spent.
 * 
 * @param {string} userId - Authenticated user ID.
 * @param {string} userRole - User's trip role ('OWNER', 'EDITOR', 'VIEWER').
 * @param {string} tripId - Target trip ID.
 * @param {string} settlementId - Target settlement ID.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
export const deleteSettlement = async (userId, userRole, tripId, settlementId) => {
  const existingSettlement = await Settlement.findOne({ _id: settlementId, tripId });
  if (!existingSettlement) {
    throw new ApiError(404, 'Settlement record not found in this trip workspace.');
  }

  // Authorization check matching expense permissions pattern: OWNER can delete any; EDITOR & VIEWER can delete created by or involving themselves
  if (userRole !== 'OWNER') {
    const createdById = (existingSettlement.createdBy?._id || existingSettlement.createdBy)?.toString();
    const fromUserId = (existingSettlement.fromUser?._id || existingSettlement.fromUser)?.toString();
    const toUserId = (existingSettlement.toUser?._id || existingSettlement.toUser)?.toString();
    const currentUserId = userId.toString();

    const isAuthorized =
      createdById === currentUserId ||
      fromUserId === currentUserId ||
      toUserId === currentUserId;

    if (!isAuthorized) {
      throw new ApiError(
        403,
        `Forbidden: ${userRole === 'EDITOR' ? 'Editors' : 'Viewers'} can only delete settlements created by or involving themselves.`
      );
    }
  }

  await Settlement.findByIdAndDelete(settlementId);
  return true;
};
