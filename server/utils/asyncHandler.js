/**
 * Higher-order function that wraps async route handlers to automatically
 * catch unhandled promise rejections and forward them to next(err).
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
