import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Provides different rate limits for different types of endpoints
 */

// Store for tracking failed login attempts
const failedAttempts = new Map();

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for development with validation features
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Login rate limiter (more restrictive for security)
const isProduction = process.env.NODE_ENV === 'production';
const loginWindowMs = isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000; // 15m prod, 5m dev
const loginMax = isProduction ? 5 : 50; // 5 prod, 50 dev

export const loginRateLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMax,
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: isProduction ? '15 minutes' : '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime || loginWindowMs) / 1000)
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Staff management rate limiter (more permissive for admin operations)
export const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for development (React StrictMode causes duplicate requests)
  message: {
    error: 'Too many staff management requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many staff management requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Bulk operations rate limiter (more restrictive)
export const bulkOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (more forgiving for testing)
  max: 30, // Allow up to 30 bulk ops per 15 minutes during development
  message: {
    error: 'Too many bulk operations, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many bulk operations, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Export operations rate limiter
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 export operations per hour
  message: {
    error: 'Too many export requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many export requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Survey batches rate limiter (generous for development and admin usage)
export const surveyBatchesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very generous limit for development (React StrictMode + frequent data loading)
  message: {
    error: 'Too many survey batch requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many survey batch requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Record a failed login attempt for an IP address
 * @param {string} ip - IP address
 */
export const recordFailedAttempt = (ip) => {
  const attempts = failedAttempts.get(ip) || 0;
  failedAttempts.set(ip, attempts + 1);
  
  // Auto-clear after 15 minutes
  setTimeout(() => {
    const currentAttempts = failedAttempts.get(ip);
    if (currentAttempts && currentAttempts > 0) {
      failedAttempts.set(ip, currentAttempts - 1);
    }
  }, 15 * 60 * 1000);
};

/**
 * Reset failed attempts for an IP address (called on successful login)
 * @param {string} ip - IP address
 */
export const resetFailedAttempts = (ip) => {
  failedAttempts.delete(ip);
};

/**
 * Get failed attempts count for an IP address
 * @param {string} ip - IP address
 * @returns {number} Number of failed attempts
 */
export const getFailedAttempts = (ip) => {
  return failedAttempts.get(ip) || 0;
}; 