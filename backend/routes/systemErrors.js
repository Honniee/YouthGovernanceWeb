import express from 'express';
import { query } from '../config/database.js';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limit error logging to prevent abuse
const errorLogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Maximum 50 error logs per 15 minutes per IP
  message: 'Too many error logs. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/system/errors
 * Log client-side errors for monitoring
 */
router.post('/errors', errorLogLimiter, async (req, res) => {
  try {
    const {
      message,
      stack,
      componentStack,
      url,
      userAgent,
      timestamp,
      route,
      userId
    } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Error message is required'
      });
    }

    // Generate error ID
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log to database if error_logs table exists (optional)
    try {
      // Check if error_logs table exists
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'error_logs'
        )
      `);

      if (tableExists.rows[0].exists) {
        await query(`
          INSERT INTO error_logs (
            error_id, message, stack, component_stack, url, 
            user_agent, timestamp, route, user_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          errorId,
          message,
          stack || null,
          componentStack || null,
          url || null,
          userAgent || null,
          timestamp || new Date().toISOString(),
          route || null,
          userId || 'anonymous'
        ]);
      }
    } catch (dbError) {
      // Silently fail if table doesn't exist or insert fails
      // Error logging shouldn't break the application
      // Logger will be imported below, so log this separately
      try {
        const logger = (await import('../utils/logger.js')).default;
        logger.warn('Failed to log error to database', { message: dbError.message });
      } catch {
        // Silently fail if logger unavailable
      }
    }

    // Log to Winston logger
    const logger = (await import('../utils/logger.js')).default;
    logger.error('Client-side error', {
      errorId,
      message: message.substring(0, 500), // Truncate long messages
      stack: stack ? stack.substring(0, 2000) : null, // Truncate long stacks
      componentStack: componentStack ? componentStack.substring(0, 1000) : null,
      url,
      route,
      userId,
      userAgent: userAgent ? userAgent.substring(0, 200) : null
    });

    res.json({
      success: true,
      errorId,
      message: 'Error logged successfully'
    });
  } catch (error) {
    try {
      const logger = (await import('../utils/logger.js')).default;
      logger.error('Error logging failed', {
        message: error.message,
        stack: error.stack
      });
    } catch {
      // Fallback to logger if primary logging fails
      logger.error('Error logging failed', { error: error.message, stack: error.stack });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to log error'
    });
  }
});

export default router;

