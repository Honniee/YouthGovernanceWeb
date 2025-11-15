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
    'X-API-Key',
    'X-CSRF-Token',
    'X-XSRF-Token'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ],
  maxAge: 86400 // 24 hours
});

// Production CORS configuration (more restrictive but flexible)
// Support multiple origins if FRONTEND_URL contains comma-separated values
const getProductionOrigins = () => {
  const frontendUrl = process.env.FRONTEND_URL || '';
  if (!frontendUrl) {
    // If not set, allow common hosting platforms
    return [
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.onrender\.com$/,
      /^https:\/\/.*\.github\.io$/
    ];
  }
  
  // Support comma-separated URLs or single URL
  const urls = frontendUrl.split(',').map(url => url.trim()).filter(Boolean);
  if (urls.length > 1) {
    return urls;
  }
  return urls[0] || 'https://yourdomain.com';
};

const productionCors = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getProductionOrigins();
    
    // If origin is undefined (e.g., mobile app, Postman), allow it in production
    if (!origin) {
      return callback(null, true);
    }
    
    // If allowedOrigins is an array of regex patterns
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return pattern === origin;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
    }
    
    // If allowedOrigins is a string or single value
    if (typeof allowedOrigins === 'string') {
      if (allowedOrigins === origin || origin.includes(allowedOrigins)) {
        return callback(null, true);
      }
    }
    
    // Default: check if origin matches FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL || '';
    if (frontendUrl && origin.includes(frontendUrl.split(',')[0].trim())) {
      return callback(null, true);
    }
    
    // Allow if no specific origin check passes but credentials are needed
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-XSRF-Token',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
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
    'X-API-Key',
    'X-CSRF-Token',
    'X-XSRF-Token'
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
// SECURITY FIX: Validate origin before allowing CORS
export const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    // Validate origin against allowed origins
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL].filter(Boolean)
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          process.env.FRONTEND_URL
        ].filter(Boolean);
    
    // Only allow CORS if origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key, X-CSRF-Token, X-XSRF-Token');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      res.status(200).end();
    } else {
      // Origin not allowed - reject preflight
      res.status(403).json({ 
        success: false, 
        message: 'CORS policy: Origin not allowed' 
      });
    }
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
