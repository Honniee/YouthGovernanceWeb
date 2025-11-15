/**
 * Centralized Error Handling Service
 * Provides consistent error handling across all controllers
 */

import logger from '../utils/logger.js';

/**
 * Handle errors and send appropriate HTTP responses
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 * @param {Object} options - Additional options
 */
export const handleError = (res, error, defaultMessage = 'An error occurred', options = {}) => {
  logger.error('Error handled', { error: error.message, stack: error.stack, code: error.code, defaultMessage, options });

  // Determine status code based on error type
  let statusCode = 500;
  let message = defaultMessage;

  // Handle specific error types
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Duplicate entry found';
  } else if (error.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    message = 'Referenced record not found';
  } else if (error.code === '23514') { // PostgreSQL check constraint violation
    statusCode = 400;
    message = 'Data validation failed';
  } else if (error.code === '42P01') { // PostgreSQL undefined table
    statusCode = 500;
    message = 'Database table not found';
  } else if (error.code === '42703') { // PostgreSQL undefined column
    statusCode = 500;
    message = 'Database column not found';
  } else if (error.message && error.message.includes('validation')) {
    statusCode = 400;
    message = error.message;
  } else if (error.message && error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message && error.message.includes('permission')) {
    statusCode = 403;
    message = 'Access denied';
  } else if (error.message && error.message.includes('authentication')) {
    statusCode = 401;
    message = 'Authentication required';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    message: message,
    ...options
  };

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = error.message;
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle validation errors
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @param {string} defaultMessage - Default error message
 */
export const handleValidationError = (res, errors, defaultMessage = 'Validation failed') => {
  res.status(400).json({
    success: false,
    message: defaultMessage,
    errors: Array.isArray(errors) ? errors : [errors]
  });
};

/**
 * Handle not found errors
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const handleNotFoundError = (res, message = 'Resource not found') => {
  res.status(404).json({
    success: false,
    message: message
  });
};

/**
 * Handle unauthorized errors
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const handleUnauthorizedError = (res, message = 'Unauthorized') => {
  res.status(401).json({
    success: false,
    message: message
  });
};

/**
 * Handle forbidden errors
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const handleForbiddenError = (res, message = 'Access denied') => {
  res.status(403).json({
    success: false,
    message: message
  });
};

/**
 * Handle conflict errors
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const handleConflictError = (res, message = 'Conflict with existing data') => {
  res.status(409).json({
    success: false,
    message: message
  });
};

/**
 * Handle file upload errors
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
export const handleFileUploadError = (res, error) => {
  let statusCode = 400;
  let message = 'File upload failed';

  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'File too large';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
  } else if (error.message && error.message.includes('file type')) {
    message = 'Invalid file type';
  }

  res.status(statusCode).json({
    success: false,
    message: message
  });
};

export default {
  handleError,
  handleValidationError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleForbiddenError,
  handleConflictError,
  handleFileUploadError
};



