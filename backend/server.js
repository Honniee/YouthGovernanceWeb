import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
// Import custom middleware
import { corsMiddleware, handlePreflight, securityHeaders } from './middleware/cors.js';

// Import routes
import authRoutes from './routes/auth.js';
import testRoutes from './routes/test.js';
import staffRoutes from './routes/staff.js';
import notificationRoutes from './routes/notifications.js';
import skOfficialsRoutes from './routes/skOfficials.js';
import skTermsRoutes from './routes/skTerms.js';
import activityLogsRoutes from './routes/activityLogs.js';
import cronRoutes from './routes/cron.js';
import voterRoutes from './routes/voters.js';
import surveyBatchesRoutes from './routes/surveyBatches.js';
import youthRoutes from './routes/youth.js';
import announcementsRoutes from './routes/announcements.js';
import statisticsRoutes from './routes/statistics.js';
import barangaysRoutes from './routes/barangays.js';
// import programRoutes from './routes/programs.js';
// import eventRoutes from './routes/events.js';
// import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

// Enhanced rate limiting - More lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // Much more lenient in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Skip rate limiting in development for better debugging experience
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Development mode: Rate limiting disabled for better debugging');
} else {
  app.use(limiter);
}

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // More lenient in development
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Handle preflight requests before rate limiting
app.options('/api/auth/login', corsMiddleware);
// Only apply auth rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter);
} else {
  console.log('🚀 Development mode: Auth rate limiting disabled');
}

// Apply custom CORS middleware
app.use(corsMiddleware);

// Apply security headers
app.use(securityHeaders);

// Handle preflight requests for all routes
app.use(handlePreflight);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads (configurable via UPLOADS_DIR)
const uploadsDir = process.env.UPLOADS_DIR 
  ? process.env.UPLOADS_DIR 
  : join(__dirname, 'uploads');

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(join(uploadsDir, 'profile_pictures'), { recursive: true });
} catch (e) {
  console.warn('⚠️ Unable to ensure uploads directories:', e.message);
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sk-officials', skOfficialsRoutes);
app.use('/api/sk-terms', skTermsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/survey-batches', surveyBatchesRoutes);
app.use('/api/youth', youthRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/barangays', barangaysRoutes);
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
  console.error(err.stack);
  
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
  console.log(`🚀 Youth Development Office API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  console.log(`💡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔄 Manual term updates: http://localhost:${PORT}/api/cron/manual-update-term-statuses`);
});

// Setup global error handlers for graceful shutdown
import { setupErrorHandlers } from './middleware/errorHandler.js';
setupErrorHandlers(server);

export default app; 