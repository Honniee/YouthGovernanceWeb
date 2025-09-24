import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'http';
    
    logger.log(logLevel, 
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
  });
  
  next();
};

// Authentication logging
export const logAuth = (action, userId, userType, details = {}) => {
  logger.info(`AUTH: ${action}`, {
    userId,
    userType,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Security logging
export const logSecurity = (event, details = {}) => {
  logger.warn(`SECURITY: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Database logging
export const logDatabase = (query, duration, success = true) => {
  const level = success ? 'debug' : 'error';
  logger.log(level, `DB: ${query} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
};

// Error logging
export const logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// API logging
export const logAPI = (endpoint, method, userId, success, details = {}) => {
  logger.info(`API: ${method} ${endpoint}`, {
    userId,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export default logger; 