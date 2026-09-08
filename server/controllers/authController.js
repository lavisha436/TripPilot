import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateTokenAndSetCookie, clearTokenCookie } from '../utils/tokenUtils.js';
import * as authService from '../services/authService.js';

/**
 * 🕹️ AuthController: Express HTTP Request/Response Handler for Identity Operations.
 * Manages HTTP status codes, cookie setting/clearing, and delegates business logic to authService.
 */

/**
 * Handles user account registration.
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);

  // Mint JWT and set HTTP-Only cookie on response
  generateTokenAndSetCookie(res, { id: user._id, role: user.role });

  return res.status(201).json(
    new ApiResponse(201, { user }, 'User account registered successfully.')
  );
});

/**
 * Handles user authentication & login.
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const user = await authService.loginUser(req.body);

  // Mint JWT and set HTTP-Only cookie on response
  generateTokenAndSetCookie(res, { id: user._id, role: user.role });

  return res.status(200).json(
    new ApiResponse(200, { user }, 'User logged in successfully.')
  );
});

/**
 * Handles user logout by clearing authentication cookies.
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);

  return res.status(200).json(
    new ApiResponse(200, null, 'User logged out successfully.')
  );
});

/**
 * Retrieves profile details of the currently authenticated user.
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, { user: req.user }, 'Current user profile retrieved successfully.')
  );
});

/**
 * Updates basic profile details (name, avatar) for the logged-in user.
 * PUT /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user._id, req.body);

  return res.status(200).json(
    new ApiResponse(200, { user: updatedUser }, 'User profile updated successfully.')
  );
});

/**
 * Updates password for the logged-in user and re-issues a fresh JWT cookie.
 * PUT /api/v1/auth/update-password
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await authService.changePassword(req.user._id, currentPassword, newPassword);

  // Re-issue fresh JWT cookie since passwordChangedAt timestamp was updated
  generateTokenAndSetCookie(res, { id: user._id, role: user.role });

  return res.status(200).json(
    new ApiResponse(200, { user }, 'Password updated successfully.')
  );
});
