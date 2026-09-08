import { ApiError } from '../utils/ApiError.js';
import { ENV } from '../config/env.js';

/**
 * Global Error Handling Middleware for Express (4 parameters required).
 * Intercepts all operational, Mongoose, and unexpected errors to format clean JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. If error is not an instance of ApiError, wrap it into a standardized ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  // 2. Handle Mongoose Duplicate Key Error (E11000 - e.g. duplicate email registration)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    error = new ApiError(400, message);
  }

  // 3. Handle Mongoose Validation Errors (e.g. missing required fields)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val) => val.message).join(', ');
    error = new ApiError(400, `Invalid input data: ${message}`);
  }

  // 4. Construct unified JSON response object
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(ENV.NODE_ENV === 'development' && { stack: error.stack })
  };

  return res.status(error.statusCode).json(response);
};
