import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

/**
 * 🛣️ AuthRoutes: Router module for User Authentication & Identity Management.
 * Base Path: /api/v1/auth
 */
const router = Router();

// ==========================================
// 🔓 Public Routes (Unauthenticated Visitors)
// ==========================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account & receive auth cookie
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user credentials & receive auth cookie
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Clear HTTP-Only authentication cookie
 * @access  Public
 */
router.post('/logout', logout);

// ==========================================
// 🔒 Protected Routes (Require Valid JWT Cookie/Header)
// ==========================================
// Apply protect middleware globally to all routes defined below this line
router.use(protect);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged-in user profile details
 * @access  Private (Authenticated Users)
 */
router.get('/me', getMe);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update basic profile details (name, avatar)
 * @access  Private (Authenticated Users)
 */
router.put('/profile', updateProfile);

/**
 * @route   PUT /api/v1/auth/update-password
 * @desc    Change user password & receive re-issued auth cookie
 * @access  Private (Authenticated Users)
 */
router.put('/update-password', updatePassword);

export default router;
