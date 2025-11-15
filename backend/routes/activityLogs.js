import express from 'express';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

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

    // Get total count for pagination (no joins needed for count)
    const countSql = `
      SELECT COUNT(*) as total
      FROM "Activity_Logs" l
      ${where}
    `;
    const countResult = await query(countSql, params.slice(0, params.length));
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get paginated results with user names
    // Note: Activity_Logs.user_id stores lydo_id/sk_id/youth_id directly, not Users.user_id
    // So we join directly to the appropriate tables based on user_type
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
        -- Return timestamp as-is, we'll handle timezone conversion in JavaScript
        l.created_at,
        l.success,
        l.error_message,
        l.message,
        CASE 
          WHEN l.user_id IS NULL THEN 'System'
          WHEN l.user_type IN ('admin', 'lydo_staff') AND ly.first_name IS NOT NULL 
            THEN ly.first_name || ' ' || ly.last_name
          WHEN l.user_type = 'sk_official' AND sk.first_name IS NOT NULL 
            THEN sk.first_name || ' ' || sk.last_name
          WHEN l.user_type = 'youth' AND yp.first_name IS NOT NULL 
            THEN yp.first_name || ' ' || yp.last_name
          ELSE 'Unknown User'
        END as user_name
      FROM "Activity_Logs" l
      LEFT JOIN "LYDO" ly ON l.user_type IN ('admin', 'lydo_staff') AND l.user_id = ly.lydo_id
      LEFT JOIN "SK_Officials" sk ON l.user_type = 'sk_official' AND l.user_id = sk.sk_id
      LEFT JOIN "Youth_Profiling" yp ON l.user_type = 'youth' AND l.user_id = yp.youth_id
      ${where}
      ORDER BY l.${safeSortBy} ${safeSortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(Number(perPage));
    params.push(Number(offset));

    const result = await query(sql, params);
    
    // Format timestamps: Timestamps are stored in Asia/Manila timezone (from auditLogger)
    // PostgreSQL returns TIMESTAMP as Date object or string
    // We need to format it correctly for frontend
    const formattedRows = result.rows.map(row => {
      if (row.created_at) {
        try {
          let timestampStr;
          
          // Handle both Date objects and strings from PostgreSQL
          if (row.created_at instanceof Date) {
            // If it's already a Date object, convert to string first
            // PostgreSQL Date objects are in server timezone, but we stored in Manila time
            const year = row.created_at.getFullYear();
            const month = String(row.created_at.getMonth() + 1).padStart(2, '0');
            const day = String(row.created_at.getDate()).padStart(2, '0');
            const hour = String(row.created_at.getHours()).padStart(2, '0');
            const minute = String(row.created_at.getMinutes()).padStart(2, '0');
            const second = String(row.created_at.getSeconds()).padStart(2, '0');
            timestampStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
          } else {
            timestampStr = String(row.created_at).trim();
          }
          
          // Parse PostgreSQL TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
          // This timestamp represents time in Asia/Manila timezone
          const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
          if (match) {
            const [, year, month, day, hour, minute, second, millisecond] = match;
            // Create ISO string with timezone indicator
            // The time is already in Manila, so we mark it as +08:00
            const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${millisecond || ''}+08:00`;
            row.created_at = isoString;
          } else {
            // If already in ISO format, use as-is
            row.created_at = timestampStr;
          }
        } catch (error) {
          logger.error('Error formatting timestamp', { error: error.message, stack: error.stack, timestamp: row.created_at });
          // Keep original value on error
        }
      }
      return row;
    });
    
    res.json({ 
      success: true, 
      data: formattedRows,
      pagination: {
        total,
        page: Number(page),
        perPage: Number(perPage),
        totalPages: Math.ceil(total / Number(perPage))
      }
    });
  } catch (err) {
    logger.error('GET /api/activity-logs error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// GET /api/activity-logs/recent - get recent activity for dashboard
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const sql = `
      SELECT 
        l.log_id,
        l.user_id,
        l.user_type,
        l.action,
        l.resource_type,
        l.resource_name,
        l.details,
        l.category,
        -- Convert timestamp to Asia/Manila timezone
        (l.created_at AT TIME ZONE 'Asia/Manila')::text as created_at,
        l.success
      FROM "Activity_Logs" l
      ORDER BY l.created_at DESC
      LIMIT $1
    `;
    
    const result = await query(sql, [limit]);
    
    // Transform data for dashboard with proper timezone formatting
    const recentActivity = result.rows.map(row => {
      let timestamp = 'Just now';
      if (row.created_at) {
        // Parse timestamp as Asia/Manila timezone (UTC+8)
        const date = new Date(row.created_at + '+08:00');
        timestamp = date.toLocaleString('en-US', { 
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
      
      return {
        id: row.log_id,
        action: row.action,
        resource: row.resource_name || row.resource_type,
        userType: row.user_type,
        timestamp: timestamp,
        success: row.success
      };
    });
    
    res.json({ success: true, data: recentActivity });
  } catch (err) {
    logger.error('GET /api/activity-logs/recent error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

export default router;



