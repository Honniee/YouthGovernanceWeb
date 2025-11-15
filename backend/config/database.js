import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// Database configuration - using environment variables or fallback connection string
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Debug connection string (without password) - commented out for production
// console.log('🔍 Database connection string:', connectionString.replace(/:([^:@]+)@/, ':***@'));

const dbConfig = {
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  acquireTimeoutMillis: 60000, // Maximum time to wait for a connection from the pool
  allowExitOnIdle: false, // Don't exit when all connections are idle
};

// Create connection pool
const pool = new Pool(dbConfig);

pool.on('error', async (err) => {
  // Use logger if available, fallback to console (only for critical startup errors)
  try {
    const logger = (await import('../utils/logger.js')).default;
    logger.error('Database connection error', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  } catch {
    // Fallback for critical startup errors when logger isn't available yet
    // This is acceptable as it's a process-level error handler
    console.error('❌ Database connection error:', err);
  }
  // Don't exit the process - let the application handle the error gracefully
  // The connection pool will automatically retry connections
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only log queries in development or if QUERY_LOGGING is enabled
    if (process.env.NODE_ENV === 'development' || process.env.QUERY_LOGGING === 'true') {
      try {
        const logger = (await import('../utils/logger.js')).default;
        logger.debug(`Query executed: ${text.substring(0, 100)}...`, { duration, rows: res.rowCount });
      } catch {
        // Fallback removed - logger should always be available at this point
      }
    }
    return res;
  } catch (error) {
    try {
      const logger = (await import('../utils/logger.js')).default;
      logger.error('Query error', {
        message: error.message,
        code: error.code,
        query: text.substring(0, 200)
      });
    } catch {
      // Fallback removed - logger should always be available at this point
    }
    throw error;
  }
};

// Helper function to get a client from the pool
// Sets timezone to Asia/Manila for consistent timestamp handling
export const getClient = async () => {
  const client = await pool.connect();
  // Set timezone to Asia/Manila for this client connection
  // This ensures all timestamps are in Asia/Manila timezone (UTC+8)
  try {
    await client.query('SET timezone = \'Asia/Manila\'');
  } catch (err) {
    try {
      const logger = (await import('../utils/logger.js')).default;
      logger.warn('Failed to set timezone on client', { message: err.message });
    } catch {
      // Fallback removed - logger should always be available at this point
    }
    // Continue anyway - the query will still work
  }
  return client;
};

// Helper function to close the pool
export const closePool = async () => {
  await pool.end();
  try {
    const logger = (await import('../utils/logger.js')).default;
    logger.info('Database pool closed');
  } catch {
    // Fallback removed - logger should always be available at this point
  }
};

export default pool; 