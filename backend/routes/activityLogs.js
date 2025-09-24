import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/activity-logs - list activity logs
router.get('/', async (req, res) => {
  try {
    const { search, userType, category, success, dateFrom, dateTo, sortBy = 'created_at', sortOrder = 'desc', page = 1, perPage = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (userType) { params.push(userType); conditions.push(`l.user_type = $${params.length}`); }
    if (category) { params.push(category); conditions.push(`l.category = $${params.length}`); }
    if (success !== undefined) { params.push(success === 'true' || success === true); conditions.push(`l.success = $${params.length}`); }
    if (dateFrom) { params.push(dateFrom); conditions.push(`l.created_at >= $${params.length}`); }
    if (dateTo) { params.push(dateTo); conditions.push(`l.created_at <= $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(LOWER(l.action) LIKE LOWER($${params.length-2}) OR LOWER(l.resource_name) LIKE LOWER($${params.length-1}) OR LOWER(l.resource_type) LIKE LOWER($${params.length}))`);
    }

    // Sorting safety
    const allowedSort = new Set(['created_at','user_type','category']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = (String(sortOrder).toLowerCase() === 'asc') ? 'asc' : 'desc';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (Number(page) - 1) * Number(perPage);

    const sql = `
      SELECT 
        l.log_id,
        l.user_id,
        l.user_type,
        l.action,
        l.resource_type,
        l.resource_id,
        l.resource_name,
        l.details,
        l.category,
        l.created_at,
        l.success,
        l.error_message
      FROM "Activity_Logs" l
      ${where}
      ORDER BY l.${safeSortBy} ${safeSortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(Number(perPage));
    params.push(Number(offset));

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/activity-logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

export default router;



