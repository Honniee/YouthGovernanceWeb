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

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  // Don't exit the process - let the application handle the error gracefully
  // The connection pool will automatically retry connections
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async () => {
  return await pool.connect();
};

// Helper function to close the pool
export const closePool = async () => {
  await pool.end();
  console.log('🔒 Database pool closed');
};

export default pool; 