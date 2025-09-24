import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/youth - list youth profiles with optional filters
router.get('/', async (req, res) => {
  try {
    const { barangayId, search } = req.query;

    const conditions = [];
    const params = [];

    if (barangayId) {
      params.push(barangayId);
      conditions.push(`y.barangay_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(LOWER(y.first_name || ' ' || y.last_name) LIKE LOWER($${params.length - 1}) OR LOWER(y.email) LIKE LOWER($${params.length}))`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        y.youth_id,
        y.first_name,
        y.last_name,
        y.email,
        y.contact_number,
        y.age,
        y.gender,
        y.created_at,
        b.barangay_name
      FROM "Youth_Profiling" y
      JOIN "Barangay" b ON y.barangay_id = b.barangay_id
      ${where}
      ORDER BY y.created_at DESC
      LIMIT 500
    `;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/youth error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch youth profiles.' });
  }
});

export default router;


