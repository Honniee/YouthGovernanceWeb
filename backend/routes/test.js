import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// @route   GET /api/test/db
// @desc    Test database connection
// @access  Public
router.get('/db', async (req, res) => {
  try {
    // Test basic connection
    const result = await query('SELECT NOW() as current_time, version() as postgres_version');
    
    // Test if our tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    // Test a simple count from a key table
    let bardageCount = 0;
    try {
      const barangayResult = await query('SELECT COUNT(*) as count FROM "Barangay"');
      bardageCount = barangayResult.rows[0].count;
    } catch (error) {
      console.log('Barangay table not accessible:', error.message);
    }

    res.json({
      status: 'success',
      message: 'Database connection successful',
      database: {
        connected: true,
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].postgres_version,
        totalTables: tablesResult.rows.length,
        tables: tablesResult.rows.map(row => row.table_name),
        barangayCount: bardageCount
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// @route   GET /api/test/barangays
// @desc    Get all barangays (test data retrieval)
// @access  Public
router.get('/barangays', async (req, res) => {
  try {
    const result = await query(`
      SELECT barangay_id, barangay_name, created_at 
      FROM "Barangay" 
      ORDER BY barangay_name
    `);

    res.json({
      status: 'success',
      count: result.rows.length,
      barangays: result.rows
    });

  } catch (error) {
    console.error('Barangays fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch barangays',
      error: error.message
    });
  }
});

// @route   GET /api/test/users
// @desc    Get test user credentials for development
// @access  Public
router.get('/users', async (req, res) => {
  try {
    // Get LYDO users
    const lydoResult = await query(`
      SELECT l.lydo_id, l.email, l.first_name, l.last_name, r.role_name, 'lydo_staff' as user_type
      FROM "LYDO" l 
      JOIN "Roles" r ON l.role_id = r.role_id 
      WHERE l.is_active = true
      ORDER BY l.email
    `);

    // Get SK Officials
    const skResult = await query(`
      SELECT s.sk_id, s.email, s.first_name, s.last_name, s.position, b.barangay_name, 'sk_official' as user_type
      FROM "SK_Officials" s 
      JOIN "Barangay" b ON s.barangay_id = b.barangay_id
      WHERE s.is_active = true
      ORDER BY s.email
    `);

    // Get some Youth users (limit to 10 for testing)
    const youthResult = await query(`
      SELECT y.youth_id, y.email, y.first_name, y.last_name, b.barangay_name, 'youth' as user_type
      FROM "Youth_Profiling" y 
      JOIN "Barangay" b ON y.barangay_id = b.barangay_id
      WHERE y.is_active = true
      ORDER BY y.email
      LIMIT 10
    `);

    res.json({
      status: 'success',
      message: 'Test user credentials (all use password: "password123")',
      users: {
        lydo_staff: lydoResult.rows,
        sk_officials: skResult.rows,
        youth: youthResult.rows
      },
      loginInfo: {
        defaultPassword: "password123",
        note: "All dummy users use the same password for testing purposes"
      }
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch test users',
      error: error.message
    });
  }
});

export default router; 