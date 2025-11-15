import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
// Import custom middleware
import { corsMiddleware, handlePreflight, securityHeaders } from './middleware/cors.js';
import { generateCSRF, validateCSRF, getCSRFToken } from './middleware/csrf.js';

// Import routes
import authRoutes from './routes/auth.js';
import authRefreshRoutes from './routes/authRefresh.js';
import testRoutes from './routes/test.js';
import staffRoutes from './routes/staff.js';
import notificationRoutes from './routes/notifications.js';
import skOfficialsRoutes from './routes/skOfficials.js';
import skTermsRoutes from './routes/skTerms.js';
import activityLogsRoutes from './routes/activityLogs.js';
import validationLogsRoutes from './routes/validationLogs.js';
import cronRoutes from './routes/cron.js';
import voterRoutes from './routes/voters.js';
import surveyBatchesRoutes from './routes/surveyBatches.js';
import surveyTrackingRoutes from './routes/surveyTracking.js';
import youthRoutes from './routes/youth.js';
import announcementsRoutes from './routes/announcements.js';
import statisticsRoutes from './routes/statistics.js';
import systemNoticeRoutes from './routes/systemNotice.js';
import barangaysRoutes from './routes/barangays.js';
import youthProfilesRoutes from './routes/youthProfiles.js';
import surveyResponsesRoutes from './routes/surveyResponses.js';
import validationQueueRoutes from './routes/validationQueue.js';
import councilRoutes from './routes/council.js';
import skFederationRoutes from './routes/skFederation.js';
import clusteringRoutes from './routes/clustering.js';
import backupRoutes from './routes/backup.js';
import dataRetentionRoutes from './routes/dataRetention.js';
import securityIncidentsRoutes from './routes/securityIncidents.js';
import dataSubjectRightsRoutes from './routes/dataSubjectRights.js';
import surveySubmissionsRoutes from './routes/surveySubmissions.js';
import systemErrorsRoutes from './routes/systemErrors.js';
// import programRoutes from './routes/programs.js';
// import eventRoutes from './routes/events.js';
// import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

// Validate environment variables on startup
import { validateEnvironment } from './config/envValidation.js';
validateEnvironment();

// Import logger
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Apply CORS and security headers BEFORE any other middleware (including rate limiting)
// This ensures all responses (even errors/429) include proper CORS headers
app.use(corsMiddleware);
app.use(securityHeaders);
// Handle preflight requests for all routes early
app.use(handlePreflight);

// Enhanced security middleware
app.use(helmet({
  // Allow loading images from a different origin (frontend dev server)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // COEP can block cross-origin resources; keep disabled unless needed
  crossOriginEmbedderPolicy: false,
  // Override specific settings for production
  hsts: process.env.NODE_ENV === 'production' ? true : false
}));

// Cache control middleware for sensitive routes
app.use('/api/auth', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Enhanced rate limiting - Stricter for production security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Stricter in production (500 req/15min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      url: req.originalUrl,
      method: req.method 
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Skip rate limiting in development for better debugging experience
if (process.env.NODE_ENV === 'development') {
  logger.debug('Development mode: Rate limiting disabled for better debugging');
} else {
  app.use(limiter);
  logger.info('Rate limiting enabled for production');
}

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // More reasonable for production
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Only apply auth rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter);
  logger.info('Auth rate limiting enabled for production');
} else {
  logger.debug('Development mode: Auth rate limiting disabled');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for CSRF protection
app.use(cookieParser());

// SECURITY: CSRF Protection - Generate token for all requests
app.use(generateCSRF);

// Static files for uploads (configurable via UPLOADS_DIR)
const uploadsDir = process.env.UPLOADS_DIR 
  ? process.env.UPLOADS_DIR 
  : join(__dirname, 'uploads');

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(join(uploadsDir, 'profile_pictures'), { recursive: true });
  logger.debug(`Uploads directory created: ${uploadsDir}`);
} catch (e) {
  logger.warn(`Unable to ensure uploads directories: ${e.message}`);
}

app.use('/uploads', (req, res, next) => {
  // Ensure images can be consumed by other origins (e.g., Vite dev server)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsDir));

// Health check endpoints
import { 
  basicHealthCheck, 
  comprehensiveHealthCheck, 
  readinessProbe, 
  livenessProbe,
  metrics 
} from './middleware/healthCheck.js';

app.get('/api/health', basicHealthCheck);
app.get('/api/health/detailed', comprehensiveHealthCheck);
app.get('/api/health/ready', readinessProbe);
app.get('/api/health/live', livenessProbe);
app.get('/api/metrics', metrics);

// SECURITY: CSRF Token endpoint (public, no validation needed)
app.get('/api/csrf-token', getCSRFToken);

// API Routes
// SECURITY: Apply CSRF validation to all state-changing routes
// Note: GET, HEAD, OPTIONS are automatically skipped by validateCSRF middleware
app.use('/api/auth', authRoutes);
app.use('/api/auth', authRefreshRoutes); // Refresh token endpoint
app.use('/api/test', testRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sk-officials', skOfficialsRoutes);
app.use('/api/sk-terms', skTermsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/validation-logs', validationLogsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/survey-batches', surveyBatchesRoutes);
app.use('/api/survey-tracking', surveyTrackingRoutes);
app.use('/api/youth', youthRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/system/notice', systemNoticeRoutes);
app.use('/api/barangays', barangaysRoutes);
app.use('/api/youth-profiles', youthProfilesRoutes);
app.use('/api/survey-responses', surveyResponsesRoutes);
app.use('/api/validation-queue', validationQueueRoutes);
app.use('/api/council', councilRoutes);
app.use('/api/sk-federation', skFederationRoutes);
app.use('/api/clustering', clusteringRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/data-retention', dataRetentionRoutes);
app.use('/api/security-incidents', securityIncidentsRoutes);
app.use('/api/data-subject-rights', dataSubjectRightsRoutes);
app.use('/api/survey-submissions', surveySubmissionsRoutes);
app.use('/api/system', systemErrorsRoutes);
// app.use('/api/programs', programRoutes);
// app.use('/api/events', eventRoutes);
// app.use('/api/users', userRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Youth Development Office API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      programs: '/api/programs',
      events: '/api/events',
      users: '/api/users'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error using Winston logger
  logger.error('Express error handler', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    status: err.status || 500
  });
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON format' 
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Youth Development Office API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'production') {
    // Production: Use environment URL or generic message
    const serverUrl = process.env.SERVER_URL || 'https://your-backend.onrender.com';
    logger.info(`Server URL: ${serverUrl}`);
    logger.info(`Health Check: ${serverUrl}/api/health`);
  } else {
    // Development: Show localhost URLs
    logger.info(`Server URL: http://localhost:${PORT}`);
    logger.info(`Health Check: http://localhost:${PORT}/api/health`);
    logger.debug(`Manual term updates: http://localhost:${PORT}/api/cron/manual-update-term-statuses`);
  }
});

// Attach Socket.IO realtime server
import { initSocket } from './server-socket.js';
try {
  initSocket(server);
  logger.info('Realtime (Socket.IO) initialized');
} catch (e) {
  logger.warn(`Failed to initialize realtime server: ${e?.message}`);
}

// Setup global error handlers for graceful shutdown
import { setupErrorHandlers } from './middleware/errorHandler.js';
setupErrorHandlers(server);

export default app; 