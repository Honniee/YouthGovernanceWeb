/**
 * Authentication Middleware Tests
 * Tests for JWT authentication middleware
 */

import jwt from 'jsonwebtoken';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { query } from '../config/database.js';

// Mock database query
jest.mock('../config/database.js', () => ({
  query: jest.fn(),
}));

// Mock logger
jest.mock('../utils/logger.js', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long-for-testing';
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    
    test('should return 401 if no token provided', async () => {
      req.headers.authorization = undefined;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token does not start with Bearer', async () => {
      req.headers.authorization = 'Invalid token';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, userType: 'admin', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token expired.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should attach user to request for valid admin token', async () => {
      const token = jwt.sign(
        { userId: 1, userType: 'admin', email: 'admin@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      // Mock database query result
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true,
          role_name: 'admin',
          permissions: { all: true },
          user_type: 'admin'
        }]
      });

      await authenticateToken(req, res, next);

      expect(query).toHaveBeenCalled();
      expect(req.user).toMatchObject({
        id: 1,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        userType: 'admin',
        role: 'admin',
        isActive: true
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 if user not found in database', async () => {
      const token = jwt.sign(
        { userId: 999, userType: 'admin', email: 'notfound@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      // Mock empty database result
      query.mockResolvedValueOnce({ rows: [] });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found or inactive.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle invalid user type', async () => {
      const token = jwt.sign(
        { userId: 1, userType: 'invalid', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid user type in token.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    
    test('should set req.user to null if no token provided', async () => {
      req.headers.authorization = undefined;

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    test('should authenticate user if valid token provided', async () => {
      const token = jwt.sign(
        { userId: 1, userType: 'admin', email: 'admin@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true,
          role_name: 'admin',
          permissions: { all: true },
          user_type: 'admin'
        }]
      });

      await optionalAuth(req, res, next);

      expect(req.user).not.toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });
});

