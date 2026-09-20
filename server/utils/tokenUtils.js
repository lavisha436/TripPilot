import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Utility functions for signing JWTs, verifying token signatures,
 * and configuring secure HTTP-Only authentication cookies.
 */

/**
 * Signs a new JWT token containing user id and role claims.
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN
  });
};

/**
 * Generates JWT and sets an HTTP-Only cookie on the Express response object.
 */
export const generateTokenAndSetCookie = (res, payload) => {
  const token = generateToken(payload);

  const cookieOptions = {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: Number(ENV.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000 // Convert days to milliseconds
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

/**
 * Clears the authentication HTTP-Only cookie (used on Logout).
 * Specifies matching security attributes to guarantee cross-browser cookie removal.
 */
export const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0)
  });
};

/**
 * Verifies a JWT token signature.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, ENV.JWT_SECRET);
};

