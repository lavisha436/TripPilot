import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as expenseService from '../services/expenseService.js';

/**
 * 🕹️ ExpenseController: Express HTTP Request/Response Handler for Expense Tracking & Analytics.
 * Handles HTTP status codes, parameter extraction, and delegates financial logic to expenseService.
 */

/**
 * Creates a new expense entry in a trip workspace.
 * POST /api/v1/trips/:tripId/expenses
 */
export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(
    req.user._id,
    req.params.tripId,
    req.body
  );

  return res.status(201).json(
    new ApiResponse(201, { expense }, 'Expense recorded successfully.')
  );
});

/**
 * Retrieves all expenses for a trip workspace with optional category filter.
 * GET /api/v1/trips/:tripId/expenses?category=FOOD
 */
export const getTripExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getTripExpenses(
    req.params.tripId,
    req.query.category
  );

  return res.status(200).json(
    new ApiResponse(200, { expenses }, 'Trip expenses retrieved successfully.')
  );
});

/**
 * Retrieves financial analytics, category breakdowns, and member debt balances for a trip.
 * GET /api/v1/trips/:tripId/expenses/analytics
 * ⚠️ Note: Function position in controller matches REST route precedence requirements.
 */
export const getExpenseAnalytics = asyncHandler(async (req, res) => {
  const analytics = await expenseService.getExpenseAnalytics(req.params.tripId);

  return res.status(200).json(
    new ApiResponse(200, { analytics }, 'Expense analytics retrieved successfully.')
  );
});

/**
 * Retrieves specific expense details by ID within a trip workspace.
 * GET /api/v1/trips/:tripId/expenses/:expenseId
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(
    req.params.tripId,
    req.params.expenseId
  );

  return res.status(200).json(
    new ApiResponse(200, { expense }, 'Expense details retrieved successfully.')
  );
});

/**
 * Updates expense details and syncs total trip budget spent.
 * PUT /api/v1/trips/:tripId/expenses/:expenseId
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const updatedExpense = await expenseService.updateExpense(
    req.user._id,
    req.tripMember?.role,
    req.params.tripId,
    req.params.expenseId,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(200, { expense: updatedExpense }, 'Expense updated successfully.')
  );
});

/**
 * Deletes an expense entry and recalculates total trip budget spent.
 * DELETE /api/v1/trips/:tripId/expenses/:expenseId
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(
    req.user._id,
    req.tripMember?.role,
    req.params.tripId,
    req.params.expenseId
  );

  return res.status(200).json(
    new ApiResponse(200, null, 'Expense deleted successfully.')
  );
});

/**
 * Records an inter-member settlement payment.
 * POST /api/v1/trips/:tripId/settlements
 */
export const createSettlement = asyncHandler(async (req, res) => {
  const settlement = await expenseService.createSettlement(
    req.user._id,
    req.params.tripId,
    req.body
  );

  return res.status(201).json(
    new ApiResponse(201, { settlement }, 'Settlement recorded successfully.')
  );
});

/**
 * Deletes a recorded settlement payment and restores outstanding debt.
 * DELETE /api/v1/trips/:tripId/settlements/:settlementId
 */
export const deleteSettlement = asyncHandler(async (req, res) => {
  await expenseService.deleteSettlement(
    req.user._id,
    req.tripMember?.role,
    req.params.tripId,
    req.params.settlementId
  );

  return res.status(200).json(
    new ApiResponse(200, null, 'Settlement record deleted successfully.')
  );
});
