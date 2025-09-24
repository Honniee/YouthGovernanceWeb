import { query } from '../config/database.js';

/**
 * Enhanced Health Check Middleware
 * Provides comprehensive system health monitoring
 */

/**
 * Basic health check endpoint
 */
export const basicHealthCheck = async (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      message: 'Youth Development Office API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
};

/**
 * Comprehensive health check with database connectivity
 */
export const comprehensiveHealthCheck = async (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: { status: 'UNKNOWN', responseTime: 0 },
      memory: { status: 'OK', usage: 0 },
      disk: { status: 'OK' }
    }
  };

  let overallStatus = 'OK';

  try {
    // Check database connectivity
    const dbStart = Date.now();
    await query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - dbStart;
    
    healthStatus.checks.database = {
      status: 'OK',
      responseTime: dbResponseTime
    };
  } catch (error) {
    healthStatus.checks.database = {
      status: 'ERROR',
      error: error.message,
      responseTime: 0
    };
    overallStatus = 'DEGRADED';
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  healthStatus.checks.memory = {
    status: memoryUsagePercent > 90 ? 'WARNING' : 'OK',
    usage: Math.round(memoryUsagePercent),
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal
  };

  if (memoryUsagePercent > 90) {
    overallStatus = 'DEGRADED';
  }

  // Set overall status
  healthStatus.status = overallStatus;

  const statusCode = overallStatus === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
};

/**
 * Readiness probe for container orchestration
 */
export const readinessProbe = async (req, res) => {
  try {
    // Check if database is accessible
    await query('SELECT 1 as ready');
    
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Liveness probe for container orchestration
 */
export const livenessProbe = async (req, res) => {
  // Simple check - if the process is running, it's alive
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Metrics endpoint for monitoring
 */
export const metrics = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      environment: process.env.NODE_ENV
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
};
