import { getClient } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get youth who participated in a specific survey batch
 * GET /api/survey-tracking/:batchId/participated
 */
export const getParticipatedYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    const { batchId } = req.params;
    const { page = 1, limit = 10, barangay, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['ksr.batch_id = $1', 'ksr.validation_status = \'validated\''];
    let queryParams = [batchId];
    let paramIndex = 2;

    // Filter by barangay
    if (barangay) {
      whereConditions.push(`yp.barangay_id = $${paramIndex}`);
      queryParams.push(barangay);
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(`(
        LOWER(yp.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(yp.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(yp.youth_id) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT ksr.youth_id) as total
      FROM "KK_Survey_Responses" ksr
      INNER JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      WHERE ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT DISTINCT
        yp.youth_id,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.birth_date,
        yp.age,
        yp.gender,
        yp.contact_number,
        yp.email,
        yp.barangay_id,
        b.barangay_name,
        yp.purok_zone,
        ksr.response_id,
        ksr.created_at as responded_at,
        ksr.validation_status,
        ksr.validation_date
      FROM "KK_Survey_Responses" ksr
      INNER JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE ${whereClause}
      ORDER BY ksr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, queryParams.slice(0, -2)),
      client.query(dataQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: dataResult.rows.map(row => ({
        youthId: row.youth_id,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        suffix: row.suffix,
        fullName: `${row.first_name} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name}${row.suffix ? ' ' + row.suffix : ''}`.trim(),
        birthDate: row.birth_date,
        age: row.age,
        gender: row.gender,
        contactNumber: row.contact_number,
        email: row.email,
        barangayId: row.barangay_id,
        barangayName: row.barangay_name,
        purokZone: row.purok_zone,
        responseId: row.response_id,
        respondedAt: row.responded_at,
        validationStatus: row.validation_status,
        validationDate: row.validation_date
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error getting participated youth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participated youth',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get youth who did NOT participate in a specific survey batch
 * GET /api/survey-tracking/:batchId/not-participated
 */
export const getNotParticipatedYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    const { batchId } = req.params;
    const { page = 1, limit = 10, barangay, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get batch details for age range
    const batchQuery = await client.query(
      'SELECT target_age_min, target_age_max, start_date, end_date FROM "KK_Survey_Batches" WHERE batch_id = $1',
      [batchId]
    );

    if (batchQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    const batch = batchQuery.rows[0];
    const ageMin = batch.target_age_min || 15;
    const ageMax = batch.target_age_max || 30;

    // Eligible youth = voters in the voters list (they are the eligible participants)
    // We need to find voters who don't have a validated response for this batch
    let whereConditions = [
      `NOT EXISTS (
        SELECT 1 
        FROM "KK_Survey_Responses" ksr
        INNER JOIN "Youth_Profiling" yp2 ON ksr.youth_id = yp2.youth_id
        WHERE ksr.batch_id = $1
        AND ksr.validation_status = 'validated'
        AND LOWER(TRIM(yp2.first_name)) = LOWER(TRIM(v.first_name))
        AND LOWER(TRIM(yp2.last_name)) = LOWER(TRIM(v.last_name))
        AND (LOWER(TRIM(COALESCE(yp2.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) 
             OR (yp2.middle_name IS NULL AND v.middle_name IS NULL))
        AND (LOWER(TRIM(COALESCE(yp2.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) 
             OR (yp2.suffix IS NULL AND v.suffix IS NULL))
        AND yp2.birth_date = v.birth_date
        AND yp2.gender = v.gender
      )`,
      `EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) >= $2`,
      `EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) <= $3`,
      'v.is_active = true'
    ];
    
    let queryParams = [batchId, ageMin, ageMax];
    let paramIndex = 4;

    // Filter by barangay (need to match with Youth_Profiling or use a different approach)
    // For now, we'll use Voters_List which doesn't have barangay_id directly
    // We need to match by name to Youth_Profiling to get barangay
    // This is complex, so let's use a different approach: match voters to youth profiles

    // Search filter
    if (search) {
      whereConditions.push(`(
        LOWER(v.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(v.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(v.voter_id) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query - count eligible voters who haven't participated
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Voters_List" v
      WHERE ${whereClause}
    `;

    // Data query - get voters who haven't participated, with matched youth profile info if available
    const dataQuery = `
      SELECT 
        v.voter_id,
        v.first_name,
        v.last_name,
        v.middle_name,
        v.suffix,
        v.birth_date,
        v.gender,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) as age,
        COALESCE(yp.barangay_id, NULL) as barangay_id,
        COALESCE(b.barangay_name, NULL) as barangay_name,
        COALESCE(yp.purok_zone, NULL) as purok_zone,
        COALESCE(yp.contact_number, NULL) as contact_number,
        COALESCE(yp.email, NULL) as email,
        CASE WHEN yp.youth_id IS NOT NULL THEN true ELSE false END as has_profile
      FROM "Voters_List" v
      LEFT JOIN "Youth_Profiling" yp ON 
        LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
        AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
        AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) 
             OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
        AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) 
             OR (yp.suffix IS NULL AND v.suffix IS NULL))
        AND yp.birth_date = v.birth_date
        AND yp.gender = v.gender
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE ${whereClause}
      ORDER BY v.last_name, v.first_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, queryParams.slice(0, -2)),
      client.query(dataQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    // Filter by barangay if specified (post-query filter since barangay is from join)
    let filteredData = dataResult.rows;
    let filteredTotal = total;
    if (barangay) {
      filteredData = filteredData.filter(row => row.barangay_id === barangay);
      // Recalculate total for filtered results
      const filteredCountQuery = `
        SELECT COUNT(*) as total
        FROM "Voters_List" v
        LEFT JOIN "Youth_Profiling" yp ON 
          LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
          AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
          AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) 
               OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
          AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) 
               OR (yp.suffix IS NULL AND v.suffix IS NULL))
          AND yp.birth_date = v.birth_date
          AND yp.gender = v.gender
        WHERE ${whereClause} AND yp.barangay_id = $${paramIndex}
      `;
      const filteredCountResult = await client.query(filteredCountQuery, [...queryParams.slice(0, -2), barangay]);
      filteredTotal = parseInt(filteredCountResult.rows[0].total);
      filteredData = filteredData.slice(0, parseInt(limit)); // Apply pagination
    }

    res.json({
      success: true,
      data: filteredData.map(row => ({
        voterId: row.voter_id,
        youthId: row.has_profile ? (row.barangay_id ? 'matched' : null) : null,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        suffix: row.suffix,
        fullName: `${row.first_name} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name}${row.suffix ? ' ' + row.suffix : ''}`.trim(),
        birthDate: row.birth_date,
        age: parseInt(row.age),
        gender: row.gender,
        barangayId: row.barangay_id,
        barangayName: row.barangay_name,
        purokZone: row.purok_zone,
        contactNumber: row.contact_number,
        email: row.email,
        hasProfile: row.has_profile
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error getting not-participated youth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve not-participated youth',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get barangay-level participation statistics for a batch
 * GET /api/survey-tracking/:batchId/barangay-stats
 */
export const getBarangayStats = async (req, res) => {
  const client = await getClient();
  
  try {
    const { batchId } = req.params;

    // Get batch details for age range
    const batchQuery = await client.query(
      'SELECT target_age_min, target_age_max FROM "KK_Survey_Batches" WHERE batch_id = $1',
      [batchId]
    );

    if (batchQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    const batch = batchQuery.rows[0];
    const ageMin = batch.target_age_min || 15;
    const ageMax = batch.target_age_max || 30;

    // Get barangay statistics
    const statsQuery = `
      WITH eligible_voters_by_barangay AS (
        SELECT 
          COALESCE(yp.barangay_id, 'unknown') as barangay_id,
          COALESCE(b.barangay_name, 'Unknown Barangay') as barangay_name,
          COUNT(DISTINCT v.voter_id) as eligible_count
        FROM "Voters_List" v
        LEFT JOIN "Youth_Profiling" yp ON 
          LOWER(TRIM(yp.first_name)) = LOWER(TRIM(v.first_name))
          AND LOWER(TRIM(yp.last_name)) = LOWER(TRIM(v.last_name))
          AND (LOWER(TRIM(COALESCE(yp.middle_name, ''))) = LOWER(TRIM(COALESCE(v.middle_name, ''))) 
               OR (yp.middle_name IS NULL AND v.middle_name IS NULL))
          AND (LOWER(TRIM(COALESCE(yp.suffix, ''))) = LOWER(TRIM(COALESCE(v.suffix, ''))) 
               OR (yp.suffix IS NULL AND v.suffix IS NULL))
          AND yp.birth_date = v.birth_date
          AND yp.gender = v.gender
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        WHERE 
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) >= $1
          AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.birth_date)) <= $2
          AND v.is_active = true
        GROUP BY COALESCE(yp.barangay_id, 'unknown'), COALESCE(b.barangay_name, 'Unknown Barangay')
      ),
      participated_by_barangay AS (
        SELECT 
          yp.barangay_id,
          b.barangay_name,
          COUNT(DISTINCT ksr.youth_id) as participated_count
        FROM "KK_Survey_Responses" ksr
        INNER JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        WHERE ksr.batch_id = $3
        AND ksr.validation_status = 'validated'
        GROUP BY yp.barangay_id, b.barangay_name
      )
      SELECT 
        COALESCE(ev.barangay_id, pb.barangay_id) as barangay_id,
        COALESCE(ev.barangay_name, pb.barangay_name) as barangay_name,
        COALESCE(ev.eligible_count, 0) as eligible_count,
        COALESCE(pb.participated_count, 0) as participated_count,
        (COALESCE(ev.eligible_count, 0) - COALESCE(pb.participated_count, 0)) as not_participated_count,
        CASE 
          WHEN COALESCE(ev.eligible_count, 0) > 0 
          THEN ROUND((COALESCE(pb.participated_count, 0)::DECIMAL / ev.eligible_count) * 100, 2)
          ELSE 0
        END as participation_rate
      FROM eligible_voters_by_barangay ev
      FULL OUTER JOIN participated_by_barangay pb ON ev.barangay_id = pb.barangay_id
      ORDER BY participation_rate ASC, eligible_count DESC
    `;

    const result = await client.query(statsQuery, [ageMin, ageMax, batchId]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        barangayId: row.barangay_id,
        barangayName: row.barangay_name,
        eligibleCount: parseInt(row.eligible_count) || 0,
        participatedCount: parseInt(row.participated_count) || 0,
        notParticipatedCount: parseInt(row.not_participated_count) || 0,
        participationRate: parseFloat(row.participation_rate) || 0
      }))
    });

  } catch (error) {
    logger.error('Error getting barangay stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangay statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get all youth with their participation status across all batches
 * GET /api/survey-tracking/youth-participation
 */
export const getYouthParticipation = async (req, res) => {
  const client = await getClient();
  
  try {
    const { page = 1, limit = 20, barangay, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    // Filter by barangay
    if (barangay) {
      whereConditions.push(`yp.barangay_id = $${paramIndex}`);
      queryParams.push(barangay);
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(`(
        LOWER(yp.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(yp.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(yp.youth_id) LIKE LOWER($${paramIndex})
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get all batches
    const batchesQuery = `
      SELECT 
        batch_id,
        batch_name,
        start_date,
        end_date,
        status
      FROM "KK_Survey_Batches"
      WHERE status IN ('active', 'closed')
      ORDER BY start_date DESC
    `;
    const batchesResult = await client.query(batchesQuery);
    const allBatches = batchesResult.rows;

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT yp.youth_id) as total
      FROM "Youth_Profiling" yp
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE ${whereClause}
    `;

    // Data query - get youth with their participation status for each batch
    const dataQuery = `
      SELECT DISTINCT
        yp.youth_id,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.birth_date,
        yp.age,
        yp.gender,
        yp.contact_number,
        yp.email,
        yp.barangay_id,
        b.barangay_name,
        yp.purok_zone,
        yp.created_at
      FROM "Youth_Profiling" yp
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE ${whereClause}
      ORDER BY yp.last_name, yp.first_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, queryParams.slice(0, -2)),
      client.query(dataQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    // For each youth, get their participation status for each batch
    const youthWithParticipation = await Promise.all(
      dataResult.rows.map(async (youth) => {
        // Get all batches this youth participated in
        const participationQuery = `
          SELECT DISTINCT batch_id
          FROM "KK_Survey_Responses"
          WHERE youth_id = $1
          AND validation_status = 'validated'
        `;
        const participationResult = await client.query(participationQuery, [youth.youth_id]);
        const participatedBatchIds = new Set(participationResult.rows.map(r => r.batch_id));

        // Create batch participation array
        const batchParticipation = allBatches.map(batch => ({
          batchId: batch.batch_id,
          batchName: batch.batch_name,
          startDate: batch.start_date,
          endDate: batch.end_date,
          status: batch.status,
          participated: participatedBatchIds.has(batch.batch_id)
        }));

        return {
          youthId: youth.youth_id,
          firstName: youth.first_name,
          lastName: youth.last_name,
          middleName: youth.middle_name,
          suffix: youth.suffix,
          fullName: `${youth.first_name} ${youth.middle_name ? youth.middle_name + ' ' : ''}${youth.last_name}${youth.suffix ? ' ' + youth.suffix : ''}`.trim(),
          birthDate: youth.birth_date,
          age: youth.age,
          gender: youth.gender,
          contactNumber: youth.contact_number,
          email: youth.email,
          barangayId: youth.barangay_id,
          barangayName: youth.barangay_name,
          purokZone: youth.purok_zone,
          createdAt: youth.created_at,
          batchParticipation,
          participatedCount: batchParticipation.filter(b => b.participated).length,
          totalBatches: allBatches.length
        };
      })
    );

    res.json({
      success: true,
      data: youthWithParticipation,
      batches: allBatches.map(b => ({
        batchId: b.batch_id,
        batchName: b.batch_name,
        startDate: b.start_date,
        endDate: b.end_date,
        status: b.status
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error getting youth participation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve youth participation data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get all youth grouped by barangay with current survey participation status
 * GET /api/survey-tracking/barangay-youth
 */
export const getBarangayYouth = async (req, res) => {
  const client = await getClient();
  
  try {
    // Get current active batch
    const activeBatchQuery = await client.query(`
      SELECT batch_id, batch_name, start_date, end_date, target_age_min, target_age_max
      FROM "KK_Survey_Batches"
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const activeBatch = activeBatchQuery.rows[0];
    const ageMin = activeBatch?.target_age_min || 15;
    const ageMax = activeBatch?.target_age_max || 30;

    // Get all barangays with their youth
    const barangayYouthQuery = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        COUNT(DISTINCT yp.youth_id) as total_youth,
        COUNT(DISTINCT CASE 
          WHEN ksr.batch_id = $1 AND ksr.validation_status = 'validated' 
          THEN yp.youth_id 
        END) as participated_count
      FROM "Barangay" b
      LEFT JOIN "Youth_Profiling" yp ON b.barangay_id = yp.barangay_id
      LEFT JOIN "KK_Survey_Responses" ksr ON yp.youth_id = ksr.youth_id 
        AND ksr.batch_id = $1 
        AND ksr.validation_status = 'validated'
      WHERE yp.youth_id IS NOT NULL
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY b.barangay_name
    `;

    const barangayStats = await client.query(barangayYouthQuery, [activeBatch?.batch_id || null]);

    // Get youth details for each barangay
    const youthDetailsQuery = `
      SELECT 
        yp.youth_id,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.birth_date,
        yp.age,
        yp.gender,
        yp.contact_number,
        yp.email,
        yp.barangay_id,
        b.barangay_name,
        yp.purok_zone,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM "KK_Survey_Responses" ksr
            WHERE ksr.youth_id = yp.youth_id
            AND ksr.batch_id = $1
            AND ksr.validation_status = 'validated'
          ) THEN true
          ELSE false
        END as participated_in_current
      FROM "Youth_Profiling" yp
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      WHERE yp.is_active = true
      ORDER BY b.barangay_name, yp.last_name, yp.first_name
    `;

    const youthResult = await client.query(youthDetailsQuery, [activeBatch?.batch_id || null]);

    // Group youth by barangay
    const youthByBarangay = youthResult.rows.reduce((acc, youth) => {
      const barangayId = youth.barangay_id || 'unknown';
      if (!acc[barangayId]) {
        acc[barangayId] = {
          barangayId: youth.barangay_id,
          barangayName: youth.barangay_name || 'Unknown',
          youth: []
        };
      }
      acc[barangayId].youth.push({
        youthId: youth.youth_id,
        firstName: youth.first_name,
        lastName: youth.last_name,
        middleName: youth.middle_name,
        suffix: youth.suffix,
        fullName: `${youth.first_name} ${youth.middle_name ? youth.middle_name + ' ' : ''}${youth.last_name}${youth.suffix ? ' ' + youth.suffix : ''}`.trim(),
        birthDate: youth.birth_date,
        age: youth.age,
        gender: youth.gender,
        contactNumber: youth.contact_number,
        email: youth.email,
        purokZone: youth.purok_zone,
        participatedInCurrent: youth.participated_in_current
      });
      return acc;
    }, {});

    // Combine stats with youth details
    const result = barangayStats.rows.map(stat => ({
      barangayId: stat.barangay_id,
      barangayName: stat.barangay_name,
      totalYouth: parseInt(stat.total_youth) || 0,
      participatedCount: parseInt(stat.participated_count) || 0,
      notParticipatedCount: parseInt(stat.total_youth) - parseInt(stat.participated_count || 0),
      participationRate: stat.total_youth > 0 
        ? Math.round((parseInt(stat.participated_count || 0) / parseInt(stat.total_youth)) * 100)
        : 0,
      youth: youthByBarangay[stat.barangay_id]?.youth || []
    }));

    // Calculate overall statistics
    const totalYouth = result.reduce((sum, b) => sum + b.totalYouth, 0);
    const totalParticipated = result.reduce((sum, b) => sum + b.participatedCount, 0);
    const totalNotParticipated = result.reduce((sum, b) => sum + b.notParticipatedCount, 0);

    res.json({
      success: true,
      data: result,
      currentBatch: activeBatch ? {
        batchId: activeBatch.batch_id,
        batchName: activeBatch.batch_name,
        startDate: activeBatch.start_date,
        endDate: activeBatch.end_date
      } : null,
      statistics: {
        totalBarangays: result.length,
        totalYouth,
        totalParticipated,
        totalNotParticipated,
        overallParticipationRate: totalYouth > 0 ? Math.round((totalParticipated / totalYouth) * 100) : 0
      }
    });

  } catch (error) {
    logger.error('Error getting barangay youth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve barangay youth data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get SK officials for a specific barangay
 * GET /api/survey-tracking/sk-officials/:barangayId
 */
export const getSKOfficialsByBarangay = async (req, res) => {
  const client = await getClient();
  
  try {
    const { barangayId } = req.params;

    const query = `
      SELECT 
        sk.sk_id,
        sk.email,
        r.role_name,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.is_active,
        sk.account_access,
        sp.contact_number
      FROM "SK_Officials" sk
      INNER JOIN "Roles" r ON sk.role_id = r.role_id
      LEFT JOIN "SK_Officials_Profiling" sp ON sk.sk_id = sp.sk_id
      WHERE sk.barangay_id = $1
      AND sk.is_active = true
      ORDER BY 
        CASE r.role_name
          WHEN 'SK Chairperson' THEN 1
          WHEN 'SK Secretary' THEN 2
          WHEN 'SK Treasurer' THEN 3
          ELSE 4
        END,
        sk.last_name, sk.first_name
    `;

    const result = await client.query(query, [barangayId]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        skId: row.sk_id,
        email: row.email,
        roleName: row.role_name,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        suffix: row.suffix,
        fullName: `${row.first_name} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name}${row.suffix ? ' ' + row.suffix : ''}`.trim(),
        isActive: row.is_active,
        accountAccess: row.account_access,
        contactNumber: row.contact_number
      }))
    });

  } catch (error) {
    logger.error('Error getting SK officials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve SK officials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

