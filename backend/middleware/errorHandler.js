import { createAuditLog } from './auditLogger.js';

/**
 * Comprehensive Error Handling Middleware
 * Provides centralized error handling and logging
 */

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('🚨 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Create audit log for errors
  createAuditLog({
    userId: req.user?.id || 'anonymous',
    userType: req.user?.userType || 'anonymous',
    action: req.method,
    resource: req.baseUrl + req.path,
    resourceId: req.params.id || null,
    details: {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'error',
    errorMessage: err.message
  }).catch(logErr => console.error('Failed to log error:', logErr));

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError();
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // PostgreSQL errors
  if (err.code === '23505') { // unique_violation
    const message = 'Duplicate entry';
    error = new ConflictError(message);
  }

  if (err.code === '23503') { // foreign_key_violation
    const message = 'Referenced resource not found';
    error = new NotFoundError();
  }

  if (err.code === '23502') { // not_null_violation
    const message = 'Required field missing';
    error = new ValidationError(message);
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new AppError('Too many requests', 429);
  }

  // Default error response
  const errorResponse = {
    success: false,
    message: error.message || 'Internal server error',
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: {
        name: err.name,
        code: err.code,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    })
  };

  // Send error response
  res.status(error.statusCode || 500).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  next(error);
};

// Graceful shutdown handler
export const gracefulShutdown = (server) => {
  return (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (err) => {
  console.error('🚨 Unhandled Promise Rejection:', err);
  console.error('Stack:', err.stack);
  
  // Close server and exit process
  process.exit(1);
};

// Uncaught exception handler
export const handleUncaughtException = (err) => {
  console.error('🚨 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  
  // Close server and exit process
  process.exit(1);
};

// Setup global error handlers
export const setupErrorHandlers = (server) => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
  
  process.on('SIGTERM', gracefulShutdown(server));
  process.on('SIGINT', gracefulShutdown(server));
};






