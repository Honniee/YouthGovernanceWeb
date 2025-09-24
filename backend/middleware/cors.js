import cors from 'cors';

/**
 * CORS Configuration Middleware
 * Provides secure cross-origin resource sharing settings
 */

// Development CORS configuration
const developmentCors = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ],
  maxAge: 86400 // 24 hours
});

// Production CORS configuration (more restrictive)
const productionCors = cors({
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count'
  ],
  maxAge: 86400 // 24 hours
});

// API-specific CORS for staff management
const staffApiCors = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ]
});

// Export the appropriate CORS configuration based on environment
export const corsMiddleware = process.env.NODE_ENV === 'production' 
  ? productionCors 
  : developmentCors;

export const staffCorsMiddleware = staffApiCors;

// Preflight handler for complex requests
export const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.status(200).end();
  } else {
    next();
  }
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.header('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Referrer policy
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content security policy
  if (process.env.NODE_ENV === 'production') {
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;");
  } else {
    // Relax CSP in development to allow local frontend/backend communication
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' http://localhost:5173 http://127.0.0.1:5173 http://localhost:3001 http://127.0.0.1:3001;");
  }
  
  next();
};
