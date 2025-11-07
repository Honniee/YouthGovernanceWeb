import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/validation-logs - list validation logs
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      action, 
      tier, 
      dateFrom, 
      dateTo, 
      sortBy = 'validation_date', 
      sortOrder = 'desc', 
      page = 1, 
      perPage = 50 
    } = req.query;

    const conditions = [];
    const params = [];

    if (action) { 
      params.push(action); 
      conditions.push(`vl.validation_action = $${params.length}`); 
    }
    if (tier) { 
      params.push(tier); 
      conditions.push(`vl.validation_tier = $${params.length}`); 
    }
    if (dateFrom) { 
      params.push(dateFrom); 
      conditions.push(`vl.validation_date >= $${params.length}`); 
    }
    if (dateTo) { 
      params.push(dateTo); 
      conditions.push(`vl.validation_date <= $${params.length}`); 
    }
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(
        LOWER(sk.first_name || ' ' || sk.last_name) LIKE LOWER($${params.length-2}) 
        OR LOWER(yp.first_name || ' ' || yp.last_name) LIKE LOWER($${params.length-1}) 
        OR LOWER(vl.validation_comments) LIKE LOWER($${params.length})
        OR LOWER(vl.response_id) LIKE LOWER($${params.length})
      )`);
    }

    // Sorting safety
    const allowedSort = new Set(['validation_date', 'validation_action', 'validation_tier']);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'validation_date';
    const safeSortOrder = (String(sortOrder).toLowerCase() === 'asc') ? 'asc' : 'desc';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (Number(page) - 1) * Number(perPage);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM "Validation_Logs" vl
      LEFT JOIN "SK_Officials" sk ON vl.validated_by = sk.sk_id
      LEFT JOIN "KK_Survey_Responses" ksr ON vl.response_id = ksr.response_id
      LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      ${where}
    `;
    const countResult = await query(countSql, params.slice(0, params.length));
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get paginated results with related data
    const sql = `
      SELECT 
        vl.log_id,
        vl.response_id,
        vl.validated_by,
        vl.validation_action,
        vl.validation_tier,
        vl.validation_comments,
        vl.validation_date,
        sk.first_name || ' ' || sk.last_name as validator_name,
        sk.position as validator_position,
        b.barangay_name as validator_barangay,
        yp.first_name || ' ' || yp.last_name as youth_name,
        yp.youth_id,
        ksr.batch_id,
        kb.batch_name,
        ksr.validation_status,
        b2.barangay_name as youth_barangay
      FROM "Validation_Logs" vl
      LEFT JOIN "SK_Officials" sk ON vl.validated_by = sk.sk_id
      LEFT JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "KK_Survey_Responses" ksr ON vl.response_id = ksr.response_id
      LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      LEFT JOIN "Barangay" b2 ON yp.barangay_id = b2.barangay_id
      LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
      ${where}
      ORDER BY vl.${safeSortBy} ${safeSortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(Number(perPage));
    params.push(Number(offset));

    const result = await query(sql, params);
    
    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        total,
        page: Number(page),
        perPage: Number(perPage),
        totalPages: Math.ceil(total / Number(perPage))
      }
    });
  } catch (err) {
    console.error('GET /api/validation-logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch validation logs' });
  }
});

export default router;

