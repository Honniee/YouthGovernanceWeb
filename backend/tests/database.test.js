/**
 * Database Connection Tests
 * Tests for database connectivity and query execution
 */

import { query, getClient, closePool } from '../config/database.js';

// Skip database tests if DATABASE_URL is not set for testing
const skipDBTests = !process.env.DATABASE_URL && !process.env.DB_HOST;

const describeDBTests = skipDBTests ? describe.skip : describe;

describeDBTests('Database Connection', () => {
  
  describe('Database Query', () => {
    test('should execute a simple query', async () => {
      const result = await query('SELECT 1 as test');
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].test).toBe(1);
    }, 10000);

    test('should handle parameterized queries', async () => {
      const result = await query('SELECT $1::text as value', ['test-value']);
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].value).toBe('test-value');
    }, 10000);

    test('should return row count', async () => {
      const result = await query('SELECT 1 as test UNION SELECT 2');
      
      expect(result.rowCount).toBe(2);
      expect(result.rows.length).toBe(2);
    }, 10000);
  });

  describe('Database Client', () => {
    test('should get a client from pool', async () => {
      const client = await getClient();
      
      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(typeof client.query).toBe('function');
      
      // Release client
      client.release();
    }, 10000);

    test('should set timezone to Asia/Manila', async () => {
      const client = await getClient();
      
      try {
        const result = await client.query("SHOW timezone");
        expect(result.rows[0].timezone).toBe('Asia/Manila');
      } finally {
        client.release();
      }
    }, 10000);
  });

  afterAll(async () => {
    // Close pool after all tests
    if (!skipDBTests) {
      await closePool();
    }
  });
});

