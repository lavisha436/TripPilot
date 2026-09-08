import { Router } from 'express';
import {
  createExpense,
  getTripExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseAnalytics,
  createSettlement,
  deleteSettlement
} from '../controllers/expenseController.js';
import { protect, checkTripRole } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ ExpenseRoutes: Router module for Expense Tracking & Financial Analytics.
 * Base Path: /api/v1/trips/:tripId/expenses
 * Uses mergeParams: true to inherit parent route parameters (:tripId).
 */
const router = Router({ mergeParams: true });

// ==========================================
// 🔒 All Expense Routes Require Authentication
// ==========================================
router.use(protect);

/**
 * @route   POST /api/v1/trips/:tripId/expenses
 * @desc    Create a new expense entry in a trip workspace
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   GET /api/v1/trips/:tripId/expenses
 * @desc    Get all expenses for a trip (optional query ?category=FOOD)
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 */
router.route('/')
  .post(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), createExpense)
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getTripExpenses);

/**
 * @route   GET /api/v1/trips/:tripId/expenses/analytics
 * @desc    Get financial summary, category breakdowns, and member debt balances
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * ⚠️ Defined BEFORE /:expenseId to prevent route conflict matching!
 */
router.get(
  '/analytics',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  getExpenseAnalytics
);

/**
 * @route   POST /api/v1/trips/:tripId/expenses/settlements
 * @desc    Record an inter-member settlement payment
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   DELETE /api/v1/trips/:tripId/expenses/settlements/:settlementId
 * @desc    Delete a recorded settlement payment and restore debt
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * ⚠️ Defined BEFORE /:expenseId to prevent route conflict matching!
 */
router.post(
  '/settlements',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  createSettlement
);

router.delete(
  '/settlements/:settlementId',
  checkTripRole('OWNER', 'EDITOR', 'VIEWER'),
  deleteSettlement
);

/**
 * @route   GET /api/v1/trips/:tripId/expenses/:expenseId
 * @desc    Get specific expense details by ID
 * @access  Private (Accepted OWNER, EDITOR, VIEWER)
 * 
 * @route   PUT /api/v1/trips/:tripId/expenses/:expenseId
 * @desc    Update expense details and sync total trip budget spent
 * @access  Private (Accepted OWNER, EDITOR, VIEWER - Viewers can edit own expenses)
 * 
 * @route   DELETE /api/v1/trips/:tripId/expenses/:expenseId
 * @desc    Delete an expense entry and sync total trip budget spent
 * @access  Private (Accepted OWNER, EDITOR, VIEWER - Viewers can delete own expenses)
 */
router.route('/:expenseId')
  .get(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), getExpenseById)
  .put(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), updateExpense)
  .delete(checkTripRole('OWNER', 'EDITOR', 'VIEWER'), deleteExpense);

export default router;
