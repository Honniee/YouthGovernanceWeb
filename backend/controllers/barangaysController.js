import { getClient } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get all barangays with youth statistics
 * @desc Get list of all barangays with youth population data
 * @access Public
 */
export const getAllBarangays = async (req, res) => {
  const client = await getClient();
  
  try {
    const { sortBy = 'barangay_name', sortOrder = 'asc', search = '' } = req.query;
    
    // Build the query with search and sorting
    let query = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        b.created_at,
        b.updated_at,
        COUNT(y.youth_id) FILTER (WHERE y.is_active = true) as youth_count,
        COUNT(y.youth_id) as total_youth_count,
        COUNT(DISTINCT y.purok_zone) as purok_count,
        STRING_AGG(DISTINCT y.purok_zone, ', ' ORDER BY y.purok_zone) as puroks
      FROM "Barangay" b
      LEFT JOIN "Youth_Profiling" y ON b.barangay_id = y.barangay_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (b.barangay_name ILIKE $${paramCount} OR b.barangay_id ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    query += ` GROUP BY b.barangay_id, b.barangay_name, b.created_at, b.updated_at`;
    
    // Add sorting
    const validSortFields = ['barangay_name', 'youth_count', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      query += ` ORDER BY barangay_name ASC`;
    }
    
    const result = await client.query(query, queryParams);
    
    // Transform the data
    const barangays = result.rows.map(row => ({
      barangay_id: row.barangay_id,
      barangay_name: row.barangay_name,
      youth_count: parseInt(row.youth_count) || 0,
      total_youth_count: parseInt(row.total_youth_count) || 0,
      purok_count: parseInt(row.purok_count) || 0,
      puroks: row.puroks ? row.puroks.split(', ').filter(p => p.trim()) : [],
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    res.json({
      success: true,
      data: barangays,
      message: 'Barangays retrieved successfully',
      meta: {
        total: barangays.length,
        sortBy,
        sortOrder,
        search: search || null
      }
    });
    
  } catch (error) {
    logger.error('Error fetching barangays:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangays',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get barangay by ID with detailed information
 * @desc Get detailed information about a specific barangay
 * @access Public
 */
export const getBarangayById = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Barangay ID is required'
      });
    }
    
    // Get barangay basic info
    const barangayQuery = `
      SELECT 
        barangay_id,
        barangay_name,
        created_at,
        updated_at
      FROM "Barangay"
      WHERE barangay_id = $1
    `;
    
    const barangayResult = await client.query(barangayQuery, [id]);
    
    if (barangayResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barangay not found'
      });
    }
    
    const barangay = barangayResult.rows[0];
    
    // Get youth statistics for this barangay
    const youthStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_youth_count,
        COUNT(*) as total_youth_count,
        COUNT(*) FILTER (WHERE gender = 'Male') as male_count,
        COUNT(*) FILTER (WHERE gender = 'Female') as female_count,
        COUNT(DISTINCT purok_zone) as purok_count,
        STRING_AGG(DISTINCT purok_zone, ', ' ORDER BY purok_zone) as puroks,
        AVG(age) as average_age,
        MIN(age) as min_age,
        MAX(age) as max_age
      FROM "Youth_Profiling"
      WHERE barangay_id = $1
    `;
    
    const youthStatsResult = await client.query(youthStatsQuery, [id]);
    const youthStats = youthStatsResult.rows[0];
    
    // Get age distribution
    const ageDistributionQuery = `
      SELECT 
        CASE 
          WHEN age BETWEEN 15 AND 17 THEN '15-17'
          WHEN age BETWEEN 18 AND 21 THEN '18-21'
          WHEN age BETWEEN 22 AND 25 THEN '22-25'
          WHEN age BETWEEN 26 AND 30 THEN '26-30'
          ELSE '30+'
        END as age_group,
        COUNT(*) as count
      FROM "Youth_Profiling"
      WHERE barangay_id = $1 AND is_active = true
      GROUP BY 
        CASE 
          WHEN age BETWEEN 15 AND 17 THEN '15-17'
          WHEN age BETWEEN 18 AND 21 THEN '18-21'
          WHEN age BETWEEN 22 AND 25 THEN '22-25'
          WHEN age BETWEEN 26 AND 30 THEN '26-30'
          ELSE '30+'
        END
      ORDER BY age_group
    `;
    
    const ageDistributionResult = await client.query(ageDistributionQuery, [id]);
    
    // Get recent youth registrations (last 30 days)
    const recentRegistrationsQuery = `
      SELECT COUNT(*) as count
      FROM "Youth_Profiling"
      WHERE barangay_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
        AND is_active = true
    `;
    
    const recentRegistrationsResult = await client.query(recentRegistrationsQuery, [id]);
    
    const detailedBarangay = {
      ...barangay,
      statistics: {
        youth: {
          active_count: parseInt(youthStats.active_youth_count) || 0,
          total_count: parseInt(youthStats.total_youth_count) || 0,
          male_count: parseInt(youthStats.male_count) || 0,
          female_count: parseInt(youthStats.female_count) || 0,
          average_age: parseFloat(youthStats.average_age) || 0,
          min_age: parseInt(youthStats.min_age) || 0,
          max_age: parseInt(youthStats.max_age) || 0,
          recent_registrations: parseInt(recentRegistrationsResult.rows[0].count) || 0
        },
        puroks: {
          count: parseInt(youthStats.purok_count) || 0,
          list: youthStats.puroks ? youthStats.puroks.split(', ').filter(p => p.trim()) : []
        },
        age_distribution: ageDistributionResult.rows.map(row => ({
          age_group: row.age_group,
          count: parseInt(row.count)
        }))
      }
    };
    
    res.json({
      success: true,
      data: detailedBarangay,
      message: 'Barangay details retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Error fetching barangay details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangay details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get barangay statistics summary
 * @desc Get summary statistics for all barangays
 * @access Public
 */
export const getBarangayStatistics = async (req, res) => {
  const client = await getClient();
  
  try {
    // Get overall statistics
    const overallStatsQuery = `
      SELECT 
        COUNT(DISTINCT b.barangay_id) as total_barangays,
        COUNT(y.youth_id) FILTER (WHERE y.is_active = true) as total_active_youth,
        COUNT(y.youth_id) as total_youth,
        COUNT(DISTINCT y.purok_zone) as total_puroks,
        AVG(youth_per_barangay.active_count) as avg_youth_per_barangay
      FROM "Barangay" b
      LEFT JOIN "Youth_Profiling" y ON b.barangay_id = y.barangay_id
      LEFT JOIN (
        SELECT 
          barangay_id,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM "Youth_Profiling"
        GROUP BY barangay_id
      ) youth_per_barangay ON b.barangay_id = youth_per_barangay.barangay_id
    `;
    
    const overallStatsResult = await client.query(overallStatsQuery);
    const overallStats = overallStatsResult.rows[0];
    
    // Get top barangays by youth count
    const topBarangaysQuery = `
      SELECT 
        b.barangay_name,
        b.barangay_id,
        COUNT(y.youth_id) FILTER (WHERE y.is_active = true) as youth_count
      FROM "Barangay" b
      LEFT JOIN "Youth_Profiling" y ON b.barangay_id = y.barangay_id
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY youth_count DESC
      LIMIT 5
    `;
    
    const topBarangaysResult = await client.query(topBarangaysQuery);
    
    // Get youth distribution by gender
    const genderDistributionQuery = `
      SELECT 
        gender,
        COUNT(*) as count
      FROM "Youth_Profiling"
      WHERE is_active = true
      GROUP BY gender
      ORDER BY gender
    `;
    
    const genderDistributionResult = await client.query(genderDistributionQuery);
    
    const statistics = {
      overall: {
        total_barangays: parseInt(overallStats.total_barangays) || 0,
        total_active_youth: parseInt(overallStats.total_active_youth) || 0,
        total_youth: parseInt(overallStats.total_youth) || 0,
        total_puroks: parseInt(overallStats.total_puroks) || 0,
        avg_youth_per_barangay: Math.round(parseFloat(overallStats.avg_youth_per_barangay) || 0)
      },
      top_barangays: topBarangaysResult.rows.map(row => ({
        barangay_name: row.barangay_name,
        barangay_id: row.barangay_id,
        youth_count: parseInt(row.youth_count)
      })),
      gender_distribution: genderDistributionResult.rows.map(row => ({
        gender: row.gender,
        count: parseInt(row.count)
      })),
      last_updated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: statistics,
      message: 'Barangay statistics retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Error fetching barangay statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangay statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get youth list for a specific barangay
 * @desc Get list of youth members in a specific barangay
 * @access Public (but could be restricted to admin/staff)
 */
export const getBarangayYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      activeOnly = true, 
      sortBy = 'last_name', 
      sortOrder = 'asc' 
    } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Barangay ID is required'
      });
    }
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    
    // Build query
    let query = `
      SELECT 
        youth_id,
        first_name,
        last_name,
        middle_name,
        suffix,
        purok_zone,
        age,
        gender,
        contact_number,
        email,
        is_active,
        created_at
      FROM "Youth_Profiling"
      WHERE barangay_id = $1
    `;
    
    const queryParams = [id];
    let paramCount = 1;
    
    // Add active filter
    if (activeOnly === 'true') {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      queryParams.push(true);
    }
    
    // Add sorting
    const validSortFields = ['last_name', 'first_name', 'age', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      query += ` ORDER BY last_name ASC`;
    }
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);
    
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM "Youth_Profiling"
      WHERE barangay_id = $1
    `;
    
    const countParams = [id];
    if (activeOnly === 'true') {
      countQuery += ` AND is_active = $2`;
      countParams.push(true);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get barangay name
    const barangayQuery = `SELECT barangay_name FROM "Barangay" WHERE barangay_id = $1`;
    const barangayResult = await client.query(barangayQuery, [id]);
    const barangayName = barangayResult.rows[0]?.barangay_name || 'Unknown';
    
    const youthList = result.rows.map(row => ({
      youth_id: row.youth_id,
      name: {
        first: row.first_name,
        last: row.last_name,
        middle: row.middle_name,
        suffix: row.suffix,
        full: `${row.first_name}${row.middle_name ? ' ' + row.middle_name : ''} ${row.last_name}${row.suffix ? ' ' + row.suffix : ''}`
      },
      purok_zone: row.purok_zone,
      age: row.age,
      gender: row.gender,
      contact_number: row.contact_number,
      email: row.email,
      is_active: row.is_active,
      created_at: row.created_at
    }));
    
    res.json({
      success: true,
      data: {
        barangay_id: id,
        barangay_name: barangayName,
        youth: youthList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          total_pages: Math.ceil(total / limitNum),
          has_next: pageNum < Math.ceil(total / limitNum),
          has_prev: pageNum > 1
        },
        filters: {
          active_only: activeOnly === 'true',
          sort_by: sortBy,
          sort_order: sortOrder
        }
      },
      message: 'Barangay youth list retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Error fetching barangay youth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangay youth list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};
