import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * 🛠️ AuthService: Core Business Logic Layer for Authentication & User Identity.
 * Decoupled from Express HTTP req/res objects for max reusability & clean testing.
 */

/**
 * Registers a new user account in MongoDB.
 * 
 * @param {Object} userData - User registration details ({ name, email, password }).
 * @returns {Promise<Object>} Created user document.
 */
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required for registration.');
  }

  // Check if a user account already exists with the given email address
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'User with this email address already exists.');
  }

  // Create new user (triggers password hashing in User model pre-save hook)
  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    password
  });

  // Remove password field before returning user document
  newUser.password = undefined;

  return newUser;
};

/**
 * Authenticates user credentials and validates account status.
 * 
 * @param {Object} credentials - Login credentials ({ email, password }).
 * @returns {Promise<Object>} Authenticated user document (excluding password).
 */
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required to log in.');
  }

  // Explicitly select password hash since schema defaults password to select: false
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Please contact support.');
  }

  // Verify candidate password against hashed password in database
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Remove password field before returning user document
  user.password = undefined;
  return user;
};

/**
 * Retrieves a user document by MongoDB _id.
 * 
 * @param {string} userId - Target user ID.
 * @returns {Promise<Object>} User profile document.
 */
export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }
  return user;
};

/**
 * Updates basic profile information (name, avatar).
 * 
 * @param {string} userId - Target user ID.
 * @param {Object} updateData - Profile fields to update ({ name, avatar }).
 * @returns {Promise<Object>} Updated user profile document.
 */
export const updateUserProfile = async (userId, { name, avatar }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }

  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  return user;
};

/**
 * Changes password for an authenticated user and updates security timestamps.
 * 
 * @param {string} userId - User ID requesting password change.
 * @param {string} currentPassword - Existing plain text password.
 * @param {string} newPassword - Desired new plain text password.
 * @returns {Promise<Object>} Updated user document.
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Both current password and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long.');
  }

  // Fetch user including password hash for candidate validation
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Verify current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    throw new ApiError(400, 'Current password provided is incorrect.');
  }

  // Assign new password (saving will trigger pre-save hook: hashes password & updates passwordChangedAt)
  user.password = newPassword;
  await user.save();

  user.password = undefined;
  return user;
};
