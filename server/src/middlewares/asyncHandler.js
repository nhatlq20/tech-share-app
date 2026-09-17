/**
 * Wrapper function for async controllers to forward errors to Express next()
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
