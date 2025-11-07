import { getClient } from '../config/database.js';
import { emitToAdmins, emitToRole, emitToRoom, emitBroadcast } from '../services/realtime.js';
import { generateId } from '../utils/idGenerator.js';
import { createAuditLog } from '../middleware/auditLogger.js';

// Get validation queue items with pagination and filters
export const getValidationQueue = async (req, res) => {
  const client = await getClient();
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      barangay = '',
      voterMatch = '',
      scoreMin = '',
      scoreMax = '',
      sortBy = 'submitted_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // If status is 'rejected', we need to query from KK_Survey_Responses directly
    // since rejected items are removed from Validation_Queue
    // If status is empty (all), we need to combine both Validation_Queue and rejected items
    let query;
    let queryParams = [];
    let paramCount = 0;

    if (status === 'all' || (!status && status !== 'pending' && status !== 'validated')) {
      // For "all", combine Validation_Queue items with rejected items using UNION
      query = `
        (
      SELECT 
        vq.queue_id,
        vq.response_id,
        vq.youth_id,
        vq.voter_match_type,
        vq.validation_score,
        vq.created_at as submitted_at,
        vq.updated_at,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.age,
        yp.gender,
        yp.birth_date,
        yp.contact_number,
        yp.email,
        yp.barangay_id,
            b.barangay_name,
        ksr.batch_id,
        kb.batch_name,
        ksr.validation_status,
        ksr.validated_by,
        ksr.validation_date,
            ksr.validation_comments,
            COALESCE(
              NULLIF(CONCAT_WS(' ', 
                lydo.first_name, 
                lydo.middle_name, 
                lydo.last_name, 
                lydo.suffix
              ), ''),
              NULLIF(CONCAT_WS(' ', 
                sk.first_name, 
                sk.middle_name, 
                sk.last_name, 
                sk.suffix
              ), ''),
              ksr.validated_by
            ) as validator_name,
            COALESCE(ksr.validated_by, NULL) as validator_user_id,
            lydo_role.role_name as validator_role,
            sk.position as validator_position,
            sk_barangay.barangay_name as validator_barangay
      FROM "Validation_Queue" vq
      LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
          LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
      LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
          LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
          LEFT JOIN "Roles" lydo_role ON lydo.role_id = lydo_role.role_id
          LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
          LEFT JOIN "Roles" sk_role ON sk.role_id = sk_role.role_id
          LEFT JOIN "Barangay" sk_barangay ON sk.barangay_id = sk_barangay.barangay_id
      WHERE 1=1
        )
        UNION ALL
        (
          SELECT 
            NULL as queue_id,
            ksr.response_id,
            ksr.youth_id,
            NULL as voter_match_type,
            NULL::INTEGER as validation_score,
            ksr.created_at as submitted_at,
            ksr.updated_at,
            yp.first_name,
            yp.last_name,
            yp.middle_name,
            yp.suffix,
            yp.age,
            yp.gender,
            yp.birth_date,
            yp.contact_number,
            yp.email,
            yp.barangay_id,
            b.barangay_name,
            ksr.batch_id,
            kb.batch_name,
            ksr.validation_status,
            ksr.validated_by,
            ksr.validation_date,
            ksr.validation_comments,
            COALESCE(
              NULLIF(CONCAT_WS(' ', 
                lydo.first_name, 
                lydo.middle_name, 
                lydo.last_name, 
                lydo.suffix
              ), ''),
              NULLIF(CONCAT_WS(' ', 
                sk.first_name, 
                sk.middle_name, 
                sk.last_name, 
                sk.suffix
              ), ''),
              ksr.validated_by
            ) as validator_name,
            COALESCE(ksr.validated_by, NULL) as validator_user_id,
            COALESCE(
              lydo_role.role_name,
              sk_role.role_name
            ) as validator_role,
            sk.position as validator_position,
            sk_barangay.barangay_name as validator_barangay
          FROM "KK_Survey_Responses" ksr
          LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
          LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
          LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
          LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
          LEFT JOIN "Roles" lydo_role ON lydo.role_id = lydo_role.role_id
          LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
          LEFT JOIN "Roles" sk_role ON sk.role_id = sk_role.role_id
          LEFT JOIN "Barangay" sk_barangay ON sk.barangay_id = sk_barangay.barangay_id
          WHERE ksr.validation_status = 'rejected'
            AND NOT EXISTS (
              SELECT 1 FROM "Validation_Queue" vq 
              WHERE vq.response_id = ksr.response_id
            )
        )
      `;
      queryParams = [];
      paramCount = 0;
      
      // Add search filter for "all" (applies to both parts of UNION)
      if (search) {
        paramCount++;
        query = `SELECT * FROM (${query}) as combined WHERE (
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          middle_name ILIKE $${paramCount} OR
          barangay_id ILIKE $${paramCount} OR
          validated_by ILIKE $${paramCount} OR
          batch_name ILIKE $${paramCount}
        )`;
        queryParams.push(`%${search}%`);
      }
      
      // Add barangay filter for "all"
      if (barangay) {
        if (!search) {
          query = `SELECT * FROM (${query}) as combined WHERE 1=1`;
        }
        paramCount++;
        query += ` AND barangay_id = $${paramCount}`;
        queryParams.push(barangay);
      }
      
      // Add sorting for "all"
      const validSortFields = {
        'submitted_at': 'submitted_at',
        'first_name': 'first_name',
        'last_name': 'last_name',
        'age': 'age',
        'barangay': 'barangay_id',
        'validated_by': 'validator_name',
        'validation_score': 'validation_score'
      };
      
      const sortField = validSortFields[sortBy] || 'submitted_at';
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortField} ${order}`;
      
      // Add pagination for "all"
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);
    } else if (status === 'rejected') {
      // Query rejected items from KK_Survey_Responses that are not in Validation_Queue
      query = `
        SELECT 
          NULL as queue_id,
          ksr.response_id,
          ksr.youth_id,
          NULL as voter_match_type,
          NULL::INTEGER as validation_score,
          ksr.created_at as submitted_at,
          ksr.updated_at,
          yp.first_name,
          yp.last_name,
          yp.middle_name,
          yp.suffix,
          yp.age,
          yp.gender,
          yp.birth_date,
          yp.contact_number,
          yp.email,
          yp.barangay_id,
          b.barangay_name,
          ksr.batch_id,
          kb.batch_name,
          ksr.validation_status,
          ksr.validated_by,
          ksr.validation_date,
          ksr.validation_comments,
          COALESCE(
            NULLIF(CONCAT_WS(' ', 
              lydo.first_name, 
              lydo.middle_name, 
              lydo.last_name, 
              lydo.suffix
            ), ''),
            NULLIF(CONCAT_WS(' ', 
              sk.first_name, 
              sk.middle_name, 
              sk.last_name, 
              sk.suffix
            ), ''),
            NULLIF(CONCAT_WS(' ', 
              lydo_from_log.first_name, 
              lydo_from_log.middle_name, 
              lydo_from_log.last_name, 
              lydo_from_log.suffix
            ), ''),
            NULLIF(CONCAT_WS(' ', 
              sk_from_log.first_name, 
              sk_from_log.middle_name, 
              sk_from_log.last_name, 
              sk_from_log.suffix
            ), ''),
            NULLIF(COALESCE(ksr.validated_by, al.user_id), NULL)
          ) as validator_name,
          COALESCE(ksr.validated_by, al.user_id) as validator_user_id,
          COALESCE(
            lydo_role.role_name,
            sk_role.role_name,
            lydo_from_log_role.role_name,
            sk_from_log_role.role_name
          ) as validator_role,
          COALESCE(sk.position, sk_from_log.position) as validator_position,
          COALESCE(
            sk_barangay.barangay_name,
            sk_from_log_barangay.barangay_name
          ) as validator_barangay
        FROM "KK_Survey_Responses" ksr
        LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
        LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
        LEFT JOIN "Roles" lydo_role ON lydo.role_id = lydo_role.role_id
        LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
        LEFT JOIN "Roles" sk_role ON sk.role_id = sk_role.role_id
        LEFT JOIN "Barangay" sk_barangay ON sk.barangay_id = sk_barangay.barangay_id
        LEFT JOIN LATERAL (
          SELECT al.user_id, al.user_type
          FROM "Activity_Logs" al
          WHERE al.action = 'Reject'
            AND al.resource_type = 'validation'
            AND (
              al.resource_id = ksr.youth_id 
              OR (al.details->>'responseId')::text = ksr.response_id
            )
          ORDER BY al.created_at DESC
          LIMIT 1
        ) al ON true
        LEFT JOIN "LYDO" lydo_from_log ON al.user_type IN ('admin', 'lydo_staff') AND al.user_id = lydo_from_log.lydo_id
        LEFT JOIN "Roles" lydo_from_log_role ON lydo_from_log.role_id = lydo_from_log_role.role_id
        LEFT JOIN "SK_Officials" sk_from_log ON al.user_type = 'sk_official' AND al.user_id = sk_from_log.sk_id
        LEFT JOIN "Roles" sk_from_log_role ON sk_from_log.role_id = sk_from_log_role.role_id
        LEFT JOIN "Barangay" sk_from_log_barangay ON sk_from_log.barangay_id = sk_from_log_barangay.barangay_id
        WHERE ksr.validation_status = 'rejected'
          AND NOT EXISTS (
            SELECT 1 FROM "Validation_Queue" vq 
            WHERE vq.response_id = ksr.response_id
          )
      `;
      queryParams = [];
      paramCount = 0;
      
      // Add search filter for rejected items
      if (search) {
        paramCount++;
        query += ` AND (
          yp.first_name ILIKE $${paramCount} OR 
          yp.last_name ILIKE $${paramCount} OR 
          yp.middle_name ILIKE $${paramCount} OR
          yp.barangay_id ILIKE $${paramCount} OR
          ksr.validated_by ILIKE $${paramCount} OR
          kb.batch_name ILIKE $${paramCount}
        )`;
        queryParams.push(`%${search}%`);
      }
      
      // Add barangay filter for rejected items
      if (barangay) {
        paramCount++;
        query += ` AND yp.barangay_id = $${paramCount}`;
        queryParams.push(barangay);
      }
      
      // Note: voter_match_type and validation_score are not available for rejected items
      // since they were removed from Validation_Queue
      
      // Add sorting for rejected items
      const rejectedSortFields = {
        'submitted_at': 'ksr.created_at',
        'first_name': 'yp.first_name',
        'last_name': 'yp.last_name',
        'age': 'yp.age',
        'barangay': 'yp.barangay_id',
        'validated_by': 'ksr.validated_by',
        'validation_score': 'ksr.validation_date' // Not available, use validation_date instead
      };
      
      const rejectedSortField = rejectedSortFields[sortBy] || 'ksr.validation_date';
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${rejectedSortField} ${order}`;
      
      // Add pagination for rejected items
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);
    } else {
      // Build query for items in Validation_Queue (pending/validated)
      query = `
        SELECT 
          vq.queue_id,
          vq.response_id,
          vq.youth_id,
          vq.voter_match_type,
          vq.validation_score,
          vq.created_at as submitted_at,
          vq.updated_at,
          yp.first_name,
          yp.last_name,
          yp.middle_name,
          yp.suffix,
          yp.age,
          yp.gender,
          yp.birth_date,
          yp.contact_number,
          yp.email,
          yp.barangay_id,
          b.barangay_name,
          ksr.batch_id,
          kb.batch_name,
          ksr.validation_status,
          ksr.validated_by,
          ksr.validation_date,
          ksr.validation_comments,
          COALESCE(
            NULLIF(CONCAT_WS(' ', 
              lydo.first_name, 
              lydo.middle_name, 
              lydo.last_name, 
              lydo.suffix
            ), ''),
            NULLIF(CONCAT_WS(' ', 
              sk.first_name, 
              sk.middle_name, 
              sk.last_name, 
              sk.suffix
            ), ''),
            ksr.validated_by
          ) as validator_name,
          lydo_role.role_name as validator_role,
          sk.position as validator_position,
          sk_barangay.barangay_name as validator_barangay
        FROM "Validation_Queue" vq
        LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
        LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
        LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
        LEFT JOIN "Roles" lydo_role ON lydo.role_id = lydo_role.role_id
        LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
        LEFT JOIN "Roles" sk_role ON sk.role_id = sk_role.role_id
        LEFT JOIN "Barangay" sk_barangay ON sk.barangay_id = sk_barangay.barangay_id
        WHERE 1=1
      `;
      queryParams = [];
      paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (
        yp.first_name ILIKE $${paramCount} OR 
        yp.last_name ILIKE $${paramCount} OR 
        yp.middle_name ILIKE $${paramCount} OR
        yp.barangay_id ILIKE $${paramCount} OR
        ksr.validated_by ILIKE $${paramCount} OR
        kb.batch_name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Add status filter
    if (status) {
      paramCount++;
      query += ` AND ksr.validation_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add barangay filter
    if (barangay) {
      paramCount++;
      query += ` AND yp.barangay_id = $${paramCount}`;
      queryParams.push(barangay);
    }

      // Add voter match filter (only for items in Validation_Queue)
    if (voterMatch) {
      paramCount++;
      query += ` AND vq.voter_match_type = $${paramCount}`;
      queryParams.push(voterMatch);
    }

      // Add score range filters (only for items in Validation_Queue)
    if (scoreMin) {
      paramCount++;
      query += ` AND vq.validation_score >= $${paramCount}`;
      queryParams.push(parseInt(scoreMin));
    }
    if (scoreMax) {
      paramCount++;
      query += ` AND vq.validation_score <= $${paramCount}`;
      queryParams.push(parseInt(scoreMax));
    }

    // Add sorting
    const validSortFields = {
      'submitted_at': 'vq.created_at',
      'first_name': 'yp.first_name',
      'last_name': 'yp.last_name',
      'age': 'yp.age',
      'barangay': 'yp.barangay_id',
      'validated_by': 'ksr.validated_by',
      'validation_score': 'vq.validation_score'
    };

    const sortField = validSortFields[sortBy] || 'vq.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);
    }

    console.log('🔍 Validation Queue Query:', query);
    console.log('📊 Query Params:', queryParams);

    const result = await client.query(query, queryParams);

    // Get total count for pagination
    let countQuery;
    if (status === 'all' || (!status && status !== 'pending' && status !== 'validated')) {
      // For "all", count both Validation_Queue items and rejected items using a subquery sum
      countQuery = `
        SELECT 
          (
            SELECT COUNT(*) 
            FROM "Validation_Queue" vq
            LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
            LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
            LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
            WHERE 1=1
          ) + (
            SELECT COUNT(*) 
            FROM "KK_Survey_Responses" ksr
            LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
            WHERE ksr.validation_status = 'rejected'
              AND NOT EXISTS (
                SELECT 1 FROM "Validation_Queue" vq 
                WHERE vq.response_id = ksr.response_id
              )
          ) as total
      `;
    } else if (status === 'rejected') {
      countQuery = `
        SELECT COUNT(*) as total
        FROM "KK_Survey_Responses" ksr
        LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
        LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
        WHERE ksr.validation_status = 'rejected'
          AND NOT EXISTS (
            SELECT 1 FROM "Validation_Queue" vq 
            WHERE vq.response_id = ksr.response_id
          )
      `;
    } else {
      countQuery = `
      SELECT COUNT(*) as total
      FROM "Validation_Queue" vq
      LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
      LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
      WHERE 1=1
    `;
    }

    const countParams = [];
    let countParamCount = 0;

    // Apply same filters for count
    if (status === 'all' || (!status && status !== 'pending' && status !== 'validated')) {
      // For "all", apply filters to count query
      let whereConditions = [];
      if (search) {
        countParamCount++;
        whereConditions.push(`(
          yp.first_name ILIKE $${countParamCount} OR 
          yp.last_name ILIKE $${countParamCount} OR 
          yp.middle_name ILIKE $${countParamCount} OR
          yp.barangay_id ILIKE $${countParamCount} OR
          ksr.validated_by ILIKE $${countParamCount} OR
          kb.batch_name ILIKE $${countParamCount}
        )`);
        countParams.push(`%${search}%`);
      }
      if (barangay) {
        countParamCount++;
        whereConditions.push(`yp.barangay_id = $${countParamCount}`);
        countParams.push(barangay);
      }
      
      // Rebuild count query with filters
      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';
      countQuery = `
        SELECT 
          (
            SELECT COUNT(*) 
            FROM "Validation_Queue" vq
            LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
            LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
            LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
            WHERE ${whereClause}
          ) + (
            SELECT COUNT(*) 
            FROM "KK_Survey_Responses" ksr
            LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
            LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
            WHERE ksr.validation_status = 'rejected'
              AND NOT EXISTS (
                SELECT 1 FROM "Validation_Queue" vq 
                WHERE vq.response_id = ksr.response_id
              )
              AND ${whereClause}
          ) as total
      `;
    } else if (status === 'rejected') {
      // For rejected items, add search filter
    if (search) {
      countParamCount++;
      countQuery += ` AND (
        yp.first_name ILIKE $${countParamCount} OR 
        yp.last_name ILIKE $${countParamCount} OR 
        yp.middle_name ILIKE $${countParamCount} OR
        yp.barangay_id ILIKE $${countParamCount} OR
          ksr.validated_by ILIKE $${countParamCount} OR
          kb.batch_name ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

      // Add barangay filter for rejected items
      if (barangay) {
        countParamCount++;
        countQuery += ` AND yp.barangay_id = $${countParamCount}`;
        countParams.push(barangay);
      }
    } else {
      // For non-rejected items (from Validation_Queue)
      if (search) {
        countParamCount++;
        countQuery += ` AND (
          yp.first_name ILIKE $${countParamCount} OR 
          yp.last_name ILIKE $${countParamCount} OR 
          yp.middle_name ILIKE $${countParamCount} OR
          yp.barangay_id ILIKE $${countParamCount} OR
          ksr.validated_by ILIKE $${countParamCount} OR
          kb.batch_name ILIKE $${countParamCount}
        )`;
        countParams.push(`%${search}%`);
      }

      // Add status filter for count
    if (status) {
      countParamCount++;
      countQuery += ` AND ksr.validation_status = $${countParamCount}`;
      countParams.push(status);
    }

      // Add barangay filter for count
    if (barangay) {
      countParamCount++;
      countQuery += ` AND yp.barangay_id = $${countParamCount}`;
      countParams.push(barangay);
    }

      // Add voter match filter for count
    if (voterMatch) {
      countParamCount++;
      countQuery += ` AND vq.voter_match_type = $${countParamCount}`;
      countParams.push(voterMatch);
    }

      // Add score range filters for count
    if (scoreMin) {
      countParamCount++;
      countQuery += ` AND vq.validation_score >= $${countParamCount}`;
      countParams.push(parseInt(scoreMin));
    }
    if (scoreMax) {
      countParamCount++;
      countQuery += ` AND vq.validation_score <= $${countParamCount}`;
      countParams.push(parseInt(scoreMax));
      }
    }

    const countResult = await client.query(countQuery, countParams);
    // For "all" status, the count query returns a sum (two numbers added), so we get it directly
    let totalItems;
    if (status === 'all' || (!status && status !== 'pending' && status !== 'validated')) {
      // The count query for "all" returns a single row with a calculated sum
      totalItems = parseInt(countResult.rows[0]?.total || 0);
    } else {
      totalItems = parseInt(countResult.rows[0]?.total || 0);
    }

    // Transform the data for frontend
    const validationItems = result.rows.map(row => {
      // Debug logging for rejected items
      if (row.validation_status === 'rejected') {
        console.log(`🔍 Rejected item debug - Response ID: ${row.response_id}`);
        console.log(`  validated_by: ${row.validated_by}`);
        console.log(`  validator_user_id: ${row.validator_user_id}`);
        console.log(`  validator_name: ${row.validator_name}`);
      }
      
      const validatedBy = (row.validator_name && row.validator_name.trim() !== '') 
        ? row.validator_name 
        : (row.validator_user_id || row.validated_by || null);
      
      return {
        id: row.queue_id || row.response_id, // Use response_id as id for rejected items (queue_id is NULL)
      responseId: row.response_id,
      youthId: row.youth_id,
      firstName: row.first_name,
      lastName: row.last_name,
      middleName: row.middle_name,
      suffix: row.suffix,
      age: row.age,
      gender: row.gender,
      birthDate: row.birth_date,
      contactNumber: row.contact_number,
      email: row.email,
      barangay: row.barangay_name,
      barangayId: row.barangay_id,
      batchId: row.batch_id,
      batchName: row.batch_name,
        voterMatch: row.voter_match_type || null, // NULL for rejected items
        validationScore: row.validation_score || null, // NULL for rejected items
      status: row.validation_status,
        validatedBy: validatedBy,
        validatedByUserId: row.validator_user_id || row.validated_by,
        validatorRole: row.validator_role || null,
        validatorPosition: row.validator_position || null,
        validatorBarangay: row.validator_barangay || null,
      validatedAt: row.validation_date,
      submittedAt: row.submitted_at,
      comments: row.validation_comments
      };
    });

    console.log(`✅ Found ${validationItems.length} validation items (${totalItems} total)`);

    res.json({
      success: true,
      data: validationItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        totalItems,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching validation queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch validation queue',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get validation queue statistics
export const getValidationQueueStats = async (req, res) => {
  const client = await getClient();
  try {
    // Get pending stats from Validation_Queue
    const queueStatsQuery = `
      SELECT 
        COUNT(*) as total_in_queue,
        COUNT(CASE WHEN ksr.validation_status = 'pending' THEN 1 END) as pending
      FROM "Validation_Queue" vq
      LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
    `;

    const queueStatsResult = await client.query(queueStatsQuery);
    const queueStats = queueStatsResult.rows[0];

    // Get completed stats from KK_Survey_Responses (items validated today)
    const completedStatsQuery = `
      SELECT COUNT(*) as completed
      FROM "KK_Survey_Responses" ksr
      WHERE ksr.validation_status = 'validated'
        AND DATE(ksr.validation_date) = CURRENT_DATE
    `;

    const completedStatsResult = await client.query(completedStatsQuery);
    const completedCount = parseInt(completedStatsResult.rows[0].completed || 0);

    // Get rejected stats from KK_Survey_Responses (items not in Validation_Queue)
    const rejectedStatsQuery = `
      SELECT COUNT(*) as rejected
      FROM "KK_Survey_Responses" ksr
      WHERE ksr.validation_status = 'rejected'
        AND NOT EXISTS (
          SELECT 1 FROM "Validation_Queue" vq 
          WHERE vq.response_id = ksr.response_id
        )
    `;

    const rejectedStatsResult = await client.query(rejectedStatsQuery);
    const rejectedCount = parseInt(rejectedStatsResult.rows[0].rejected || 0);

    // Combine stats
    const stats = {
      total: parseInt(queueStats.total_in_queue || 0) + rejectedCount + completedCount,
      pending: parseInt(queueStats.pending || 0),
      completed: completedCount,
      rejected: rejectedCount
    };

    // Get barangay distribution
    const barangayQuery = `
      SELECT 
        COALESCE(b.barangay_name, yp.barangay_id, 'Unknown') as barangay_name,
        COUNT(*) as count
      FROM "Validation_Queue" vq
      LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
      WHERE ksr.validation_status = 'pending'
      GROUP BY b.barangay_name, yp.barangay_id
      ORDER BY count DESC
    `;

    const barangayResult = await client.query(barangayQuery);
    const byBarangay = barangayResult.rows.reduce((acc, row) => {
      acc[row.barangay_name] = parseInt(row.count);
      return acc;
    }, {});

    // Get recent validations from KK_Survey_Responses (items that have been validated/rejected)
    const recentQuery = `
      SELECT 
        yp.first_name,
        yp.last_name,
        b.barangay_name,
        ksr.validated_by,
        ksr.validation_status,
        ksr.validation_date,
        COALESCE(
          NULLIF(CONCAT_WS(' ', 
            lydo.first_name, 
            lydo.middle_name, 
            lydo.last_name, 
            lydo.suffix
          ), ''),
          NULLIF(CONCAT_WS(' ', 
            sk.first_name, 
            sk.middle_name, 
            sk.last_name, 
            sk.suffix
          ), ''),
          ksr.validated_by
        ) as validator_name
      FROM "KK_Survey_Responses" ksr
      LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
      LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
      LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
      WHERE ksr.validation_status IN ('validated', 'rejected')
        AND ksr.validation_date IS NOT NULL
      ORDER BY ksr.validation_date DESC
      LIMIT 5
    `;

    const recentResult = await client.query(recentQuery);
    const recentValidations = recentResult.rows.map(row => ({
      firstName: row.first_name,
      lastName: row.last_name,
      barangay: row.barangay_name,
      validatedBy: row.validator_name || row.validated_by || 'System',
      status: row.validation_status,
      validatedAt: row.validation_date
    }));

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        completed: parseInt(stats.completed),
        rejected: parseInt(stats.rejected),
        byBarangay,
        recentValidations
      }
    });

  } catch (error) {
    console.error('❌ Error fetching validation queue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch validation queue statistics',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get validations completed today (lightweight history)
export const getCompletedValidationsToday = async (req, res) => {
  const client = await getClient();
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const params = [];
    let idx = 0;

    let query = `
      SELECT 
        ksr.response_id,
        ksr.youth_id,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.age,
        yp.email,
        yp.barangay_id,
        kb.batch_id,
        kb.batch_name,
        ksr.validation_status,
        ksr.validated_by,
        ksr.validation_date,
        COALESCE(
          NULLIF(CONCAT_WS(' ', 
            lydo.first_name, 
            lydo.middle_name, 
            lydo.last_name, 
            lydo.suffix
          ), ''),
          NULLIF(CONCAT_WS(' ', 
            sk.first_name, 
            sk.middle_name, 
            sk.last_name, 
            sk.suffix
          ), ''),
          ksr.validated_by
        ) as validator_name,
        lydo_role.role_name as validator_role,
        sk.position as validator_position,
        sk_barangay.barangay_name as validator_barangay
      FROM "KK_Survey_Responses" ksr
      LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
      LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
      LEFT JOIN "LYDO" lydo ON ksr.validated_by = lydo.lydo_id
      LEFT JOIN "Roles" lydo_role ON lydo.role_id = lydo_role.role_id
      LEFT JOIN "SK_Officials" sk ON ksr.validated_by = sk.sk_id
      LEFT JOIN "Roles" sk_role ON sk.role_id = sk_role.role_id
      LEFT JOIN "Barangay" sk_barangay ON sk.barangay_id = sk_barangay.barangay_id
      WHERE ksr.validation_status = 'validated' 
        AND DATE(ksr.validation_date) = CURRENT_DATE
    `;

    if (search) {
      idx++;
      query += ` AND (yp.first_name ILIKE $${idx} OR yp.last_name ILIKE $${idx} OR yp.middle_name ILIKE $${idx} OR yp.barangay_id ILIKE $${idx} OR kb.batch_name ILIKE $${idx})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY ksr.validation_date DESC`;

    idx++;
    query += ` LIMIT $${idx}`;
    params.push(parseInt(limit));
    idx++;
    query += ` OFFSET $${idx}`;
    params.push(offset);

    const result = await client.query(query, params);

    const items = result.rows.map(r => ({
      id: r.response_id,
      responseId: r.response_id,
      youthId: r.youth_id,
      firstName: r.first_name,
      lastName: r.last_name,
      middleName: r.middle_name,
      suffix: r.suffix,
      age: r.age,
      email: r.email,
      barangayId: r.barangay_id,
      batchId: r.batch_id,
      batchName: r.batch_name,
      voterMatch: 'exact',
      validationScore: 1,
      status: 'validated',
      validatedBy: r.validator_name || r.validated_by || null,
      validatedByUserId: r.validated_by,
      validatorRole: r.validator_role || null,
      validatorPosition: r.validator_position || null,
      validatorBarangay: r.validator_barangay || null,
      validatedAt: r.validation_date,
      submittedAt: r.validation_date
    }));

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('❌ Error fetching completed validations today:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch completed validations today', error: error.message });
  } finally {
    client.release();
  }
};

// Validate a queue item (approve/reject)
export const validateQueueItem = async (req, res) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const { user } = req; // From auth middleware

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    // Get the queue item details with youth name
    const queueQuery = `
      SELECT 
        vq.*, 
        ksr.response_id, 
        ksr.validation_status,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix
      FROM "Validation_Queue" vq
      LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
      LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
      WHERE vq.queue_id = $1
    `;

    const queueResult = await client.query(queueQuery, [id]);
    if (queueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Validation queue item not found'
      });
    }

    const queueItem = queueResult.rows[0];

    // Build youth name for resource name
    const youthName = queueItem.first_name && queueItem.last_name
      ? `${queueItem.first_name}${queueItem.middle_name ? ' ' + queueItem.middle_name : ''} ${queueItem.last_name}${queueItem.suffix ? ' ' + queueItem.suffix : ''}`.trim()
      : queueItem.youth_id || 'Unknown Youth';

    // Update the survey response
    const newStatus = action === 'approve' ? 'validated' : 'rejected';
    const updateResponseQuery = `
      UPDATE "KK_Survey_Responses" 
      SET 
        validation_status = $1,
        validated_by = $2,
        validation_date = CURRENT_TIMESTAMP,
        validation_comments = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE response_id = $4
      RETURNING *
    `;

    const updateResult = await client.query(updateResponseQuery, [
      newStatus,
      user.id || user.user_id,
      comments || null,
      queueItem.response_id
    ]);

    // If approved, also update the youth profile validation status
    if (action === 'approve') {
      const updateYouthProfileQuery = `
        UPDATE "Youth_Profiling"
        SET 
          validation_status = 'validated',
          validation_tier = 'manual',
          validated_by = $1,
          validation_date = (NOW() AT TIME ZONE 'Asia/Manila')
        WHERE youth_id = $2
          AND (validation_status IS NULL OR validation_status != 'validated')
      `;
      await client.query(updateYouthProfileQuery, [
        user.id || user.user_id,
        queueItem.youth_id
      ]);
      console.log(`✅ Updated youth profile ${queueItem.youth_id} validation status to 'validated'`);
    }

    // Remove from validation queue
    const deleteQueueQuery = `
      DELETE FROM "Validation_Queue" 
      WHERE queue_id = $1
      RETURNING *
    `;

    const deleteResult = await client.query(deleteQueueQuery, [id]);

    console.log(`✅ Validation ${action}ed: ${id} by ${user.id || user.user_id}`);

    // Realtime: notify dashboards and queues
    try {
      const payload = {
        type: action === 'approve' ? 'validated' : 'rejected',
        responseId: queueItem.response_id,
        queueId: id,
        youthId: queueItem.youth_id,
        barangayId: queueItem.barangay_id || null,
        batchId: queueItem.batch_id || null,
        status: newStatus,
        by: user.id || user.user_id,
        at: new Date().toISOString()
      };
      emitToAdmins('validation:queueUpdated', payload);
      emitToRole('staff', 'validation:queueUpdated', payload);
      if (payload.barangayId) emitToRoom(`barangay:${payload.barangayId}`, 'validation:queueUpdated', payload);
      // Also inform survey response listeners
      emitToAdmins('survey:responsesUpdated', payload);
      emitToRole('staff', 'survey:responsesUpdated', payload);
      if (payload.barangayId) emitToRoom(`barangay:${payload.barangayId}`, 'survey:responsesUpdated', payload);
    } catch (_) {}

    // Log activity - Updated to match plan format
    try {
      const logId = await createAuditLog({
        userId: user.id || user.user_id || user.sk_id || user.lydo_id || user.lydoId || 'SYSTEM',
        userType: user.userType || user.user_type || 'admin',
        action: 'VALIDATE_SURVEY_RESPONSE',
        resource: `/api/validation-queue/${id}/validate`,
        resourceId: queueItem.response_id,
        resourceName: `Survey Response ${queueItem.response_id}`,
        resourceType: 'survey-response',
        category: 'Survey Management',
        details: {
          response_id: queueItem.response_id,
          youth_id: queueItem.youth_id,
          old_validation_status: queueItem.validation_status || 'pending',
          new_validation_status: newStatus,
          validation_comments: comments || null,
          validated_by: user.id || user.user_id || user.sk_id || user.lydo_id || user.lydoId,
          queue_id: id,
          batch_id: queueItem.batch_id || null
        },
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      console.log('📝 Validation activity logged with id:', logId);
    } catch (logError) {
      console.error('❌ Failed to log validation activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      message: `Item ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        queueId: id,
        responseId: queueItem.response_id,
        status: newStatus,
        validatedBy: user.id || user.user_id,
        validatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error validating queue item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate queue item',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Bulk validate queue items
export const bulkValidateQueueItems = async (req, res) => {
  const client = await getClient();
  try {
    const { ids, action, comments } = req.body;
    const { user } = req; // From auth middleware

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected for validation'
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const newStatus = action === 'approve' ? 'validated' : 'rejected';
    const results = [];
    const processedItems = [];

    // Process each item
    for (const id of ids) {
      try {
        // Get queue item with youth details
        const queueQuery = `
          SELECT 
            vq.*, 
            ksr.response_id,
            yp.first_name,
            yp.last_name,
            yp.middle_name,
            yp.suffix,
            kb.batch_name
          FROM "Validation_Queue" vq
          LEFT JOIN "KK_Survey_Responses" ksr ON vq.response_id = ksr.response_id
          LEFT JOIN "Youth_Profiling" yp ON vq.youth_id = yp.youth_id
          LEFT JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
          WHERE vq.queue_id = $1
        `;

        const queueResult = await client.query(queueQuery, [id]);
        if (queueResult.rows.length === 0) {
          results.push({ id, success: false, message: 'Not found' });
          continue;
        }

        const queueItem = queueResult.rows[0];

        // Build youth name for activity log
        const youthName = queueItem.first_name && queueItem.last_name
          ? `${queueItem.first_name}${queueItem.middle_name ? ' ' + queueItem.middle_name : ''} ${queueItem.last_name}${queueItem.suffix ? ' ' + queueItem.suffix : ''}`.trim()
          : queueItem.youth_id || 'Unknown Youth';

        // Update survey response
        const updateResponseQuery = `
          UPDATE "KK_Survey_Responses" 
          SET 
            validation_status = $1,
            validated_by = $2,
            validation_date = CURRENT_TIMESTAMP,
            validation_comments = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE response_id = $4
        `;

        await client.query(updateResponseQuery, [
          newStatus,
          user.id || user.user_id,
          comments || null,
          queueItem.response_id
        ]);

        // If approved, also update the youth profile validation status
        if (action === 'approve') {
          const updateYouthProfileQuery = `
            UPDATE "Youth_Profiling"
            SET 
              validation_status = 'validated',
              validation_tier = 'manual',
              validated_by = $1,
              validation_date = (NOW() AT TIME ZONE 'Asia/Manila')
            WHERE youth_id = $2
              AND (validation_status IS NULL OR validation_status != 'validated')
          `;
          await client.query(updateYouthProfileQuery, [
            user.id || user.user_id,
            queueItem.youth_id
          ]);
        }

        // Remove from queue
        const deleteQueueQuery = `DELETE FROM "Validation_Queue" WHERE queue_id = $1`;
        await client.query(deleteQueueQuery, [id]);

        // Store item info for activity log
        processedItems.push({
          queueId: id,
          youthId: queueItem.youth_id,
          youthName: youthName,
          responseId: queueItem.response_id,
          batchId: queueItem.batch_id || null,
          batchName: queueItem.batch_name || null
        });

        results.push({ id, success: true });
        
        // Log individual activity for each item
        try {
          await createAuditLog({
            userId: user.id || user.user_id || user.sk_id || user.lydo_id || user.lydoId || null,
            userType: user.userType || user.user_type || 'admin',
            action: action === 'approve' ? 'Approve' : 'Reject',
            resource: '/api/validation-queue/bulk-validate',
            resourceId: queueItem.youth_id,
            resourceName: youthName,
            resourceType: 'validation',
            category: 'Survey Validation',
            details: {
              resourceType: 'validation',
              queueId: id,
              action: action,
              comments: comments || null,
              youthId: queueItem.youth_id,
              youthName: youthName,
              responseId: queueItem.response_id,
              validationStatus: newStatus,
              batchId: queueItem.batch_id || null,
              batchName: queueItem.batch_name || null,
              isBulkOperation: true
            },
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.get('User-Agent'),
            status: 'success'
          });
        } catch (logError) {
          console.error(`❌ Failed to log activity for item ${id}:`, logError);
          // Continue processing even if logging fails
        }
      } catch (itemError) {
        console.error(`❌ Error processing item ${id}:`, itemError);
        results.push({ id, success: false, message: itemError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ Bulk validation completed: ${successCount} success, ${failCount} failed`);

    // Realtime: bulk notify
    try {
      const payload = {
        type: action === 'approve' ? 'validated' : 'rejected',
        total: ids.length,
        success: successCount,
        failed: failCount,
        items: processedItems.slice(0, 25), // trim payload
        by: user.id || user.user_id,
        at: new Date().toISOString()
      };
      emitToAdmins('validation:queueUpdated', payload);
      emitToRole('staff', 'validation:queueUpdated', payload);
      emitToAdmins('survey:responsesUpdated', payload);
      emitToRole('staff', 'survey:responsesUpdated', payload);
    } catch (_) {}

    // Log summary bulk activity
    const bulkAction = action === 'approve' ? 'Bulk Approve' : 'Bulk Reject';
    const resourceName = `Validation Queue - ${bulkAction} (${successCount} ${successCount === 1 ? 'item' : 'items'})`;
    
    try {
      await createAuditLog({
        userId: user.id || user.user_id || user.sk_id || user.lydo_id || user.lydoId || null,
        userType: user.userType || user.user_type || 'admin',
        action: bulkAction,
        resource: '/api/validation-queue/bulk-validate',
        resourceId: null,
        resourceName: resourceName,
        resourceType: 'validation',
        category: 'Survey Validation',
        details: {
          resourceType: 'validation',
          reportType: 'validation-queue',
          totalItems: ids.length,
          successCount: successCount,
          failCount: failCount,
          action: action,
          comments: comments || null,
          queueIds: ids,
          processedItems: processedItems.map(item => ({
            queueId: item.queueId,
            youthId: item.youthId,
            youthName: item.youthName,
            responseId: item.responseId
          }))
        },
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      console.error('❌ Failed to log bulk validation activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      message: `Bulk validation completed: ${successCount} ${action}ed, ${failCount} failed`,
      data: {
        total: ids.length,
        success: successCount,
        failed: failCount,
        results
      }
    });

  } catch (error) {
    console.error('❌ Error in bulk validation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk validation',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// =============================================================================
// EXPORT OPERATIONS
// =============================================================================

/**
 * Export validation queue data (logging endpoint for activity logs)
 * Since exports are done client-side, this endpoint just logs the activity
 */
export const exportValidationQueue = async (req, res) => {
  try {
    // Support both GET (query) and POST (body)
    const source = req.method === 'POST' ? req.body : req.query;
    console.log('📦 [Export] validation-queue/export hit:', {
      method: req.method,
      payload: source,
      user: { id: req.user?.id || req.user?.user_id, type: req.user?.userType || req.user?.user_type }
    });
    const { format = 'json', selectedIds, logFormat, count: providedCount, status: filterStatus } = source;
    const actualFormat = logFormat || format;
    
    if (!['csv', 'json', 'pdf', 'excel', 'xlsx'].includes(format)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid export format. Use "csv", "json", "pdf", "excel", or "xlsx"' 
      });
    }

    let count = 0;
    let exportType = 'all';
    
    if (providedCount) {
      count = parseInt(providedCount);
      exportType = filterStatus ? `status:${filterStatus}` : 'filtered';
    } else if (selectedIds && selectedIds.length > 0) {
      const idsArray = Array.isArray(selectedIds) ? selectedIds : selectedIds.split(',');
      const sanitizedIds = idsArray
        .map(id => String(id).trim())
        .filter(id => id.length > 0);
      
      if (sanitizedIds.length > 0) {
        count = sanitizedIds.length;
        exportType = 'selected';
      }
    } else {
      const { getClient } = await import('../config/database.js');
      const client = await getClient();
      try {
        const countResult = await client.query(`
          SELECT COUNT(*) as count FROM "Validation_Queue"
        `);
        count = parseInt(countResult.rows[0].count);
      } finally {
        client.release();
      }
    }

    const userId = req.user?.user_id || req.user?.id || req.user?.sk_id || req.user?.lydo_id || req.user?.lydoId || null;
    const userType = req.user?.userType || req.user?.user_type || 'admin';
    
    // Action semantics:
    // - If explicit selectedIds were provided, treat as Bulk Export
    // - Otherwise, even if filtered/status, record as Export (page export)
    const action = (selectedIds && selectedIds.length) ? 'Bulk Export' : 'Export';
    const resourceName = `Validation Queue Export - ${actualFormat.toUpperCase()} (${count} ${count === 1 ? 'item' : 'items'})`;
    
    try {
      const logId = await createAuditLog({
        userId: userId,
        userType: userType,
        action: action,
        resource: '/api/validation-queue/export',
        resourceId: null,
        resourceName: resourceName,
        resourceType: 'validation',
        category: 'Data Export',
        details: {
          resourceType: 'validation',
          reportType: 'validation-queue',
          format: actualFormat,
          count: count,
          exportType: exportType,
          ...(filterStatus && { filterStatus })
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      console.log('📝 [Export] audit log created:', logId);
    } catch (err) {
      console.error('❌ [Export] audit log failed:', err);
    }

    return res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      total: count,
      exportType: exportType,
      format: actualFormat
    });
    
  } catch (error) {
    console.error('❌ [Export] Error in validation queue export:', error);
    
    const userId = req.user?.user_id || req.user?.id || req.user?.sk_id || req.user?.lydo_id || req.user?.lydoId || null;
    const userType = req.user?.userType || req.user?.user_type || 'admin';
    
    try {
      const logId = await createAuditLog({
        userId: userId,
        userType: userType,
        action: 'Export',
        resource: '/api/validation-queue/export',
        resourceId: null,
        resourceName: 'Validation Queue Export - Failed',
        resourceType: 'validation',
        category: 'Data Export',
        details: {
          resourceType: 'validation',
          error: error.message,
          exportFailed: true
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'error',
        errorMessage: error.message
      });
      console.log('📝 [Export] error audit log created:', logId);
    } catch (err) {
      console.error('❌ [Export] Failed export audit log error:', err);
    }

    return res.status(500).json({ 
      success: false,
      message: 'Failed to log validation queue export',
      error: error.message
    });
  }
};

