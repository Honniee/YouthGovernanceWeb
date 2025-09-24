import rateLimit from 'express-rate-limit';
import { logSecurity } from '../utils/logger.js';

/**
 * IP Whitelist Middleware (for admin access)
 */
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      return next(); // Skip in development
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logSecurity('ip_blocked', { 
        ip: clientIP, 
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied from this IP address' 
      });
    }
    
    next();
  };
};

/**
 * Request Size Limiter
 */
export const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = parseInt(maxSize) * 1024 * 1024; // Convert MB to bytes
    
    if (contentLength > maxBytes) {
      logSecurity('request_too_large', {
        size: contentLength,
        maxSize: maxBytes,
        ip: req.ip,
        endpoint: req.originalUrl
      });
      
      return res.status(413).json({
        error: 'Request entity too large'
      });
    }
    
    next();
  };
};

/**
 * Suspicious Activity Detection
 */
export const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(union\s+select|drop\s+table|insert\s+into)/i,
    /(\.\.\/|\.\.\\|\/etc\/passwd|\/windows\/system32)/i
  ];
  
  const checkString = `${req.originalUrl} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logSecurity('suspicious_activity', {
        pattern: pattern.source,
        request: {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          body: req.body,
          query: req.query
        }
      });
      
      return res.status(400).json({
        error: 'Invalid request detected'
      });
    }
  }
  
  next();
};

/**
 * Brute Force Protection for Authentication
 */
export const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Combine IP and email for more granular limiting
    return `${req.ip}-${req.body.email || 'unknown'}`;
  },
  handler: (req, res) => {
    logSecurity('brute_force_attempt', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: 'Too many failed login attempts',
      message: 'Account temporarily locked. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Security Headers Middleware
 */
export const securityHeaders = (req, res, next) => {
  // Remove server signature
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}; 