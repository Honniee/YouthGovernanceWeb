/**
 * Health Check Tests
 * Tests for health check endpoints
 */

import request from 'supertest';
import express from 'express';
import { basicHealthCheck, comprehensiveHealthCheck } from '../middleware/healthCheck.js';

const app = express();
app.get('/api/health', basicHealthCheck);
app.get('/api/health/detailed', comprehensiveHealthCheck);

describe('Health Check Endpoints', () => {
  
  describe('GET /api/health', () => {
    test('should return 200 OK with health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('version');
    });

    test('should include memory usage information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
    });

    test('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/health/detailed', () => {
    test('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('memory');
    });

    test('should include database check status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.checks.database).toHaveProperty('status');
      expect(['OK', 'UNKNOWN', 'ERROR']).toContain(response.body.checks.database.status);
    });
  });
});

