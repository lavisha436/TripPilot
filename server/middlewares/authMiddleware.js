import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/tokenUtils.js';
import { User } from '../models/User.js';
import { TripMember } from '../models/TripMember.js';

/**
 * 🔒 Protect Middleware: Authenticates client requests via JWT.
 * 
 * Sequential Verification Steps:
 * 1. Dual Token Extraction (HTTP-Only Cookie `token` OR `Authorization: Bearer <token>` header).
 * 2. Signature & Expiration Verification via `verifyToken()`.
 * 3. Database lookup for existing active user (`User.findById`).
 * 4. Security Check: Ensures password was NOT changed after JWT was issued (`passwordChangedAt` vs `decoded.iat`).
 * 5. Hydrates request object with `req.user = currentUser`.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Step 1: Extract JWT token from HTTP-Only cookie OR Authorization Bearer header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token is provided in cookie or header, block access
  if (!token) {
    throw new ApiError(401, 'You are not logged in. Please log in to get access.');
  }

  // Step 2: Verify token signature and expiration
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired authentication token. Please log in again.');
  }

  // Step 3: Check if user belonging to this token still exists in database and is active
  const currentUser = await User.findById(decoded.id).select('-password');
  if (!currentUser) {
    throw new ApiError(401, 'The user belonging to this token no longer exists.');
  }

  if (!currentUser.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Please contact support.');
  }

  // Step 4: Security Check - Check if user changed password after the token was issued (decoded.iat)
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw new ApiError(401, 'User recently changed password! Please log in again.');
  }

  // Step 5: Grant access by attaching authenticated user to request object
  req.user = currentUser;
  next();
});

/**
 * 🌐 Global System Authorization Middleware (RBAC)
 * Enforces permissions based on system-wide `User.role` ('USER', 'ADMIN').
 * 
 * @param {...string} allowedRoles - List of system roles authorized to access the route.
 */
export const restrictToSystemRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Forbidden: Access denied. Required system role: [${allowedRoles.join(', ')}].`
      );
    }
    next();
  };
};

/**
 * ✈️ Trip Member Collaboration Authorization Middleware (RBAC)
 * Enforces member permissions on specific trip workspaces based on `TripMember.role` ('OWNER', 'EDITOR', 'VIEWER').
 * 
 * Dynamically resolves tripId from `req.params.tripId`, `req.params.id`, or `req.body.tripId`.
 * 
 * @param {...string} allowedTripRoles - List of trip member roles authorized to perform the operation.
 */
export const checkTripRole = (...allowedTripRoles) => {
  return asyncHandler(async (req, res, next) => {
    // Universal tripId resolution across nested routes, direct routes, and body payloads
    const tripId = req.params.tripId || req.params.id || req.body.tripId;

    if (!tripId) {
      throw new ApiError(400, 'Trip ID is required to verify authorization.');
    }

    // Query active trip membership record
    const member = await TripMember.findOne({
      tripId,
      userId: req.user._id,
      inviteStatus: 'ACCEPTED'
    });

    if (!member) {
      throw new ApiError(403, 'Access denied: You are not an accepted member of this trip.');
    }

    // Verify member has required role permissions
    if (!allowedTripRoles.includes(member.role)) {
      throw new ApiError(
        403,
        `Forbidden: Insufficient trip privileges. Required role: [${allowedTripRoles.join(', ')}], but your role is ${member.role}.`
      );
    }

    // Attach trip member document to request for downstream controllers
    req.tripMember = member;
    next();
  });
};
