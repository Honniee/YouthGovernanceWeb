/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock logger to suppress logs during tests
jest.mock('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long-for-testing';
process.env.PORT = '3001';

// Mock environment variables that aren't needed for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

