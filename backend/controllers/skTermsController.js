import { query, getClient } from '../config/database.js';
import { computeTermStatistics } from '../services/termStatisticsService.js';
import { generateTermId } from '../utils/idGenerator.js';
import { sanitizeInput } from '../utils/validation.js';
import notificationService from '../services/notificationService.js';
import universalAuditService from '../services/universalAuditService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import universalNotificationService from '../services/universalNotificationService.js';
import skValidation from '../utils/skValidation.js';

// Simple string sanitizer for individual fields
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
};

const {
  validateTermCreation,
  validateTermActivation,
  validateTermCompletion,
  getActiveTerm: getActiveTermHelper
} = skValidation;

/**
 * Get suggested term dates that don't conflict with existing terms
 * @param {Object} client - Database client
 * @returns {Promise<Array>} Array of suggested date ranges
 */
const getSuggestedTermDates = async (client) => {
  try {
    // Get all existing terms
    const existingTerms = await client.query(`
      SELECT start_date, end_date 
      FROM "SK_Terms" 
      WHERE status != 'completed'
      ORDER BY start_date DESC
    `);
    
    const suggestions = [];
    const currentDate = new Date();
    
    // Suggest dates starting from today
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const twoYearsLater = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
    
    suggestions.push({
      label: 'Next available period',
      startDate: today.toISOString().split('T')[0],
      endDate: twoYearsLater.toISOString().split('T')[0],
      description: 'Starting from today for 2 years'
    });
    
    // If there are existing terms, suggest dates after the latest one
    if (existingTerms.rows.length > 0) {
      const latestTerm = existingTerms.rows[0];
      const afterLatestStart = new Date(latestTerm.end_date);
      afterLatestStart.setDate(afterLatestStart.getDate() + 1); // Start the day after
      const afterLatestEnd = new Date(afterLatestStart);
      afterLatestEnd.setFullYear(afterLatestEnd.getFullYear() + 2);
      
      suggestions.push({
        label: 'After existing terms',
        startDate: afterLatestStart.toISOString().split('T')[0],
        endDate: afterLatestEnd.toISOString().split('T')[0],
        description: 'Starting after the latest term ends'
      });
    }
    
    // Return just the date ranges as strings for the error response
    return suggestions.map(suggestion => 
      `${suggestion.startDate} to ${suggestion.endDate} (${suggestion.description})`
    );
  } catch (error) {
    console.error('Error getting suggested dates:', error);
    return [];
  }
};

// === LIST & SEARCH OPERATIONS ===

/**
 * Get all SK Terms with pagination and filtering
 * GET /api/sk-terms
 */
const getAllTerms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      sortBy = 'start_date',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Status filter
    if (status !== 'all') {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const allowedSortFields = ['start_date', 'end_date', 'term_name', 'status', 'created_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'start_date';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Main query - Fixed GROUP BY clause for PostgreSQL compatibility
    const sqlQuery = `
      SELECT 
        t.term_id,
        t.term_name,
        t.start_date,
        t.end_date,
        t.status,
        t.is_active,
        t.is_current,
        t.created_by,
        t.created_at,
        t.updated_at,
        t.statistics_total_officials,
        t.statistics_active_officials,
        t.statistics_inactive_officials,
        t.statistics_total_sk_chairperson,
        t.statistics_total_sk_secretary,
        t.statistics_total_sk_treasurer,
        t.statistics_total_sk_councilor,
        t.completion_type,
        t.completed_by,
        t.completed_at,
        t.last_status_change_at,
        t.last_status_change_by,
        t.status_change_reason,
        COUNT(sk.sk_id) as officials_count,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_officials_count,
        COUNT(*) OVER() as total_count
      FROM "SK_Terms" t
      LEFT JOIN "SK_Officials" sk ON t.term_id = sk.term_id
      ${whereClause}
      GROUP BY t.term_id, t.term_name, t.start_date, t.end_date, t.status, t.is_active, t.is_current, 
               t.created_by, t.created_at, t.updated_at, t.statistics_total_officials, 
               t.statistics_active_officials, t.statistics_inactive_officials, 
               t.statistics_total_sk_chairperson, t.statistics_total_sk_secretary, 
               t.statistics_total_sk_treasurer, t.statistics_total_sk_councilor, 
               t.completion_type, t.completed_by, t.completed_at, t.last_status_change_at, 
               t.last_status_change_by, t.status_change_reason
      ORDER BY t.${validSortBy} ${validSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await query(sqlQuery, queryParams);
    const terms = result.rows;
    const totalRecords = terms.length > 0 ? parseInt(terms[0].total_count) : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // Attach unified statistics per term (active-only)
    const termsWithStats = await Promise.all(
      terms.map(async (term) => {
        const statistics = await computeTermStatistics(term.term_id);
        return {
          termId: term.term_id,
          termName: term.term_name,
          startDate: term.start_date,
          endDate: term.end_date,
          status: term.status,
          officialsCount: parseInt(term.officials_count),
          activeOfficialsCount: parseInt(term.active_officials_count),
          createdAt: term.created_at,
          updatedAt: term.updated_at,
          statistics
        };
      })
    );

    res.json({
      success: true,
      data: {
        terms: termsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching SK Terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Terms',
      error: error.message
    });
  }
};

/**
 * Get active SK Term
 * GET /api/sk-terms/active
 */
const getActiveTerm = async (req, res) => {
  try {
    // REAL DATABASE QUERY for Active Term
    const activeTermQuery = `
      SELECT * FROM "SK_Terms" 
      WHERE status = 'active' 
      ORDER BY start_date DESC 
      LIMIT 1
    `;

    const result = await query(activeTermQuery);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active SK term found'
      });
    }

    const activeTerm = result.rows[0];

    // Unified statistics (active-only) using shared service
    const unifiedStats = await computeTermStatistics(activeTerm.term_id);

    res.json({
      success: true,
      data: {
        termId: activeTerm.term_id,
        termName: activeTerm.term_name,
        startDate: activeTerm.start_date,
        endDate: activeTerm.end_date,
        status: activeTerm.status,
        statistics: unifiedStats,
        createdAt: activeTerm.created_at,
        updatedAt: activeTerm.updated_at
      }
    });

    // ORIGINAL CODE (commented out until database is ready):
    /*
    const activeTerm = await getActiveTermHelper();

    if (!activeTerm) {
      return res.status(404).json({
        success: false,
        message: 'No active SK term found'
      });
    }

    // Get officials count for active term
    const officialsQuery = `
      SELECT 
        COUNT(*) as total_officials,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_officials,
        COUNT(CASE WHEN position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN position = 'SK Councilor' THEN 1 END) as councilors,
        COUNT(CASE WHEN position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN position = 'SK Treasurer' THEN 1 END) as treasurers
      FROM "SK_Officials"
      WHERE term_id = $1
    `;

    const officialsResult = await query(officialsQuery, [activeTerm.term_id]);
    const stats = officialsResult.rows[0];

    res.json({
      success: true,
      data: {
        termId: activeTerm.term_id,
        termName: activeTerm.term_name,
        startDate: activeTerm.start_date,
        endDate: activeTerm.end_date,
        status: activeTerm.status,
        description: activeTerm.description,
        statistics: {
          totalOfficials: parseInt(stats.total_officials),
          activeOfficials: parseInt(stats.active_officials),
          positions: {
            chairpersons: parseInt(stats.chairpersons),
            councilors: parseInt(stats.councilors),
            secretaries: parseInt(stats.secretaries),
            treasurers: parseInt(stats.treasurers)
          }
        },
        createdAt: activeTerm.created_at,
        updatedAt: activeTerm.updated_at
      }
    });

  */
  } catch (error) {
    console.error('Error fetching active SK Term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active SK Term',
      error: error.message
    });
  }
};

/**
 * Get SK Terms history
 * GET /api/sk-terms/history
 */
const getTermHistory = async (req, res) => {
  try {
    // TEMPORARY: Return mock term history until database is set up
    const mockTermHistory = [
      {
        termId: 'TRM002',
        termName: '2021-2023 Term',
        startDate: '2021-07-01',
        endDate: '2023-06-30',
        status: 'completed',
        // description omitted (not in schema)
        officialsCount: 28,
        createdAt: '2021-01-01T00:00:00Z',
        updatedAt: '2023-07-01T00:00:00Z'
      },
      {
        termId: 'TRM003',
        termName: '2019-2021 Term',
        startDate: '2019-07-01',
        endDate: '2021-06-30',
        status: 'completed',
        // description omitted (not in schema)
        officialsCount: 25,
        createdAt: '2019-01-01T00:00:00Z',
        updatedAt: '2021-07-01T00:00:00Z'
      }
    ];

    res.json({
      success: true,
      data: {
        terms: mockTermHistory
      }
    });

  } catch (error) {
    console.error('Error fetching SK Terms history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Terms history',
      error: error.message
    });
  }
};

/**
 * Get SK Terms statistics
 * GET /api/sk-terms/statistics
 */
const getTermStatistics = async (req, res) => {
  try {
    // TEMPORARY: Return mock term statistics until database is set up
    const mockTermStats = {
      total_terms: 3,
      active_terms: 1,
      completed_terms: 2,
      upcoming_terms: 0,
      avg_term_length_years: 2
    };

    return res.json({
      success: true,
      data: {
        totalTerms: parseInt(mockTermStats.total_terms),
        activeTerms: parseInt(mockTermStats.active_terms),
        completedTerms: parseInt(mockTermStats.completed_terms),
        upcomingTerms: parseInt(mockTermStats.upcoming_terms),
        avgTermLengthYears: parseFloat(mockTermStats.avg_term_length_years)
      }
    });

    // ORIGINAL CODE (commented out until database is ready):
    /*
    const statsQuery = `
      SELECT 
        COUNT(*) as total_terms,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_terms,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_terms,
        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_terms,
        AVG(EXTRACT(YEAR FROM age(end_date, start_date))) as avg_term_length_years
      FROM "SK_Terms"
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Get current term officials distribution
    const currentTermQuery = `
      SELECT 
        COUNT(sk.sk_id) as total_officials,
        COUNT(DISTINCT sk.barangay_id) as barangays_represented
      FROM "SK_Officials" sk
      JOIN SK_Terms t ON sk.term_id = t.term_id
      WHERE t.status = 'active'
    `;

    const currentTermResult = await query(currentTermQuery);
    const currentStats = currentTermResult.rows[0];

    res.json({
      success: true,
      data: {
        overview: {
          totalTerms: parseInt(stats.total_terms),
          activeTerms: parseInt(stats.active_terms),
          completedTerms: parseInt(stats.completed_terms),
          upcomingTerms: parseInt(stats.upcoming_terms),
          avgTermLengthYears: parseFloat(stats.avg_term_length_years) || 0
        },
        currentTerm: {
          totalOfficials: parseInt(currentStats.total_officials),
          barangaysRepresented: parseInt(currentStats.barangays_represented)
        }
      }
    });

  */
  } catch (error) {
    console.error('Error fetching SK Terms statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Terms statistics',
      error: error.message
    });
  }
};

// === INDIVIDUAL TERM OPERATIONS ===

/**
 * Get SK Term by ID
 * GET /api/sk-terms/:id
 */
const getTermById = async (req, res) => {
  try {
    const { id } = req.params;

    const sqlQuery = `
      SELECT 
        t.term_id,
        t.term_name,
        t.start_date,
        t.end_date,
        t.status,
        t.is_active,
        t.is_current,
        t.created_by,
        t.created_at,
        t.updated_at,
        t.statistics_total_officials,
        t.statistics_active_officials,
        t.statistics_inactive_officials,
        t.statistics_total_sk_chairperson,
        t.statistics_total_sk_secretary,
        t.statistics_total_sk_treasurer,
        t.statistics_total_sk_councilor,
        t.completion_type,
        t.completed_by,
        t.completed_at,
        t.last_status_change_at,
        t.last_status_change_by,
        t.status_change_reason,
        COUNT(sk.sk_id) as officials_count,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_officials_count
      FROM "SK_Terms" t
      LEFT JOIN "SK_Officials" sk ON t.term_id = sk.term_id
      WHERE t.term_id = $1
      GROUP BY t.term_id, t.term_name, t.start_date, t.end_date, t.status, t.is_active, t.is_current, 
               t.created_by, t.created_at, t.updated_at, t.statistics_total_officials, 
               t.statistics_active_officials, t.statistics_inactive_officials, 
               t.statistics_total_sk_chairperson, t.statistics_total_sk_secretary, 
               t.statistics_total_sk_treasurer, t.statistics_total_sk_councilor, 
               t.completion_type, t.completed_by, t.completed_at, t.last_status_change_at, 
               t.last_status_change_by, t.status_change_reason
    `;

    const result = await query(sqlQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SK Term not found'
      });
    }

    const term = result.rows[0];
    const statistics = await computeTermStatistics(id);

    res.json({
      success: true,
      data: {
        termId: term.term_id,
        termName: term.term_name,
        startDate: term.start_date,
        endDate: term.end_date,
        status: term.status,
        officialsCount: parseInt(term.officials_count),
        activeOfficialsCount: parseInt(term.active_officials_count),
        statistics,
        createdAt: term.created_at,
        updatedAt: term.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching SK Term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK Term',
      error: error.message
    });
  }
};

/**
 * Create new SK Term
 * POST /api/sk-terms
 */
const createTerm = async (req, res) => {
  let client;
  try {
    const rawData = req.body || {};
    const data = sanitizeInput(rawData);

    client = await getClient();
    try {
      // Validate input data with comprehensive data integrity checks
      const validation = await validateTermCreation(data, false, client);
    if (!validation.isValid) {
        // Create a more user-friendly error message with specific suggestions
        const errorCount = validation.errors.length;
        let mainMessage = 'Please fix the following issues:';
        
        // Generate specific suggestions based on validation errors
        const suggestions = await getSuggestedTermDates(client);
        let specificSuggestions = [];
        
        // Check for specific error types and provide targeted suggestions
        if (validation.errors.some(err => err.includes('already exists'))) {
          specificSuggestions.push('Try using a different term name like "2025-2027 SK Term" or "2025-2027 Term"');
        }
        
        if (validation.errors.some(err => err.includes('too short'))) {
          specificSuggestions.push('Ensure your term duration is at least 1 year (365 days)');
        }
        
        if (validation.errors.some(err => err.includes('too far in the past'))) {
          specificSuggestions.push('Use a start date within the last 30 days or today\'s date');
        }
        
        if (validation.errors.some(err => err.includes('too far in the future'))) {
          specificSuggestions.push('Use an end date within the next 10 years');
        }
        
        if (errorCount === 1) {
          mainMessage = validation.errors[0];
        } else if (errorCount === 2) {
          mainMessage = `${validation.errors[0]} and ${validation.errors[1].toLowerCase()}`;
        } else {
          mainMessage = `Please fix ${errorCount} validation issues`;
        }
        
      return res.status(400).json({
        success: false,
          message: mainMessage,
          errors: validation.errors,
          details: {
            errorCount,
            suggestions: suggestions,
            specificSuggestions: specificSuggestions
          }
      });
    }

    const {
      termName,
      startDate,
      endDate,
      autoActivate = false
      } = data;

      await client.query('BEGIN');

      // Sanitize inputs - termName is already sanitized from the data object
    const sanitizedData = {
        termName: termName.trim()
    };

    // Generate term ID
      const termId = await generateTermId();

      // Check if term ID already exists
      const idExists = await client.query('SELECT COUNT(*) AS count FROM "SK_Terms" WHERE term_id = $1', [termId]);
      if (parseInt(idExists.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Generated term ID already exists. Please retry.'
        });
      }

    // Determine status
    let status = 'upcoming';
    const currentDate = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (autoActivate && start <= currentDate && end >= currentDate) {
      // Check if there's already an active term
      const activeTermCheck = await client.query(
        'SELECT term_id FROM "SK_Terms" WHERE status = $1',
        ['active']
      );

      if (activeTermCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot auto-activate term. Another term is already active.'
        });
      }

      status = 'active';
    }

    // Insert SK Term
    const insertQuery = `
      INSERT INTO "SK_Terms" (
          term_id, term_name, start_date, end_date, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

      const createdBy = req.user?.lydoId || req.user?.userId || 'ADMIN001';
    const insertValues = [
      termId,
      sanitizedData.termName,
      startDate,
      endDate,
      status,
        createdBy
    ];

    const result = await client.query(insertQuery, insertValues);
    const newTerm = result.rows[0];

    await client.query('COMMIT');

      // Fire-and-forget notifications (don't block response)
      console.log('📧 Sending SK term creation notifications...');
      
      // Send universal notification
    universalNotificationService.sendNotificationAsync('sk-terms', 'creation', {
      termId: newTerm.term_id,
      termName: newTerm.term_name,
      startDate: newTerm.start_date,
        endDate: newTerm.end_date,
        status: newTerm.status
      }, req.user).catch(err => console.error('❌ Universal notification failed:', err));

      // Send admin notifications about term creation
      setTimeout(async () => {
        try {
          console.log('🔔 Sending term creation notification to admins...');
          await notificationService.notifyAdminsAboutTermCreation(newTerm, req.user);
        } catch (notifError) {
          console.error('Admin notification error:', notifError);
        }
      }, 100);

    // Create audit log for SK term creation
    universalAuditService.logCreation('sk-terms', {
      termId: newTerm.term_id,
      termName: newTerm.term_name,
      startDate: newTerm.start_date,
        endDate: newTerm.end_date,
        status: newTerm.status
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Audit log failed:', err));

      return res.status(201).json({
      success: true,
      message: 'SK Term created successfully',
      data: {
        termId: newTerm.term_id,
        termName: newTerm.term_name,
        startDate: newTerm.start_date,
        endDate: newTerm.end_date,
        status: newTerm.status,
        createdAt: newTerm.created_at
      }
    });

    } catch (txErr) {
    await client.query('ROLLBACK');
      
      // Handle specific database errors
      if (txErr.code === '23505') { // unique_violation
        return res.status(409).json({
          success: false,
          message: 'Term with this name already exists'
        });
      }
      
      console.error('createTerm tx error:', txErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to create SK Term',
        error: process.env.NODE_ENV === 'development' ? txErr.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Error creating SK Term:', error);
    console.error('Request body:', req.body);
    console.error('User:', req.user);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Failed to create SK Term',
      error: error.message
    });
    }
  } finally {
    // Only release if client exists and hasn't been released
    if (client && !client.released) {
    client.release();
    }
  }
};

/**
 * Update SK Term
 * PUT /api/sk-terms/:id
 */
const updateTerm = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      termName,
      startDate,
      endDate
    } = req.body;

    // Check if SK Term exists
    const existingCheck = await client.query(
      'SELECT * FROM "SK_Terms" WHERE term_id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Term not found'
      });
    }

    const existingTerm = existingCheck.rows[0];

    // Validate input data with comprehensive data integrity checks
    const validation = await validateTermCreation({
      termName,
      startDate,
      endDate,
      termId: id // Pass the term ID for update validation
    }, true, client);

    if (!validation.isValid) {
      await client.query('ROLLBACK');
      
      // Get suggested dates to help the user
      const suggestedDates = await getSuggestedTermDates(client);
      
      const errorResponse = {
        success: false,
        message: 'Validation failed',
        details: validation.errors, // Use 'details' for consistency with frontend
        suggestions: {
          message: 'Here are some suggested date ranges that should work:',
          dates: suggestedDates
        }
      };
      
      console.log('🔧 Backend sending error response:', JSON.stringify(errorResponse, null, 2));
      
      return res.status(400).json(errorResponse);
    }

    // Sanitize inputs
    const sanitizedData = {
      termName: sanitizeString(termName)
    };

    // Update SK Term
    const updateQuery = `
      UPDATE "SK_Terms" 
      SET term_name = $1, start_date = $2, end_date = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE term_id = $4
      RETURNING *
    `;

    const updateValues = [
      sanitizedData.termName,
      startDate,
      endDate,
      id
    ];

    const result = await client.query(updateQuery, updateValues);
    const updatedTerm = result.rows[0];

    await client.query('COMMIT');

    // Send notifications (fire-and-forget) - Enhanced with Universal Notification Service
    console.log('🔔 Sending term update notification...');
    try {
      await universalNotificationService.sendNotificationAsync('sk-terms', 'update', {
        // Ensure correct field mapping for nameTemplate function
      termId: updatedTerm.term_id,
      termName: updatedTerm.term_name,
      startDate: updatedTerm.start_date,
      endDate: updatedTerm.end_date
      }, {
        id: req.user?.lydo_id || req.user?.lydoId,
        userType: 'admin',
        firstName: req.user?.first_name || 'Admin',
        lastName: req.user?.last_name || 'User'
      }, { 
        originalData: {
      termId: existingTerm.term_id,
      termName: existingTerm.term_name,
      startDate: existingTerm.start_date,
      endDate: existingTerm.end_date
        }
      });
      console.log('✅ Term update notification sent');
    } catch (notificationError) {
      console.error('❌ Notification failed, but continuing with update:', notificationError);
      // Don't fail the entire update if notification fails
    }

    // Create audit log for SK term update
    try {
      await universalAuditService.logUpdate('sk-terms', id, {
      termId: updatedTerm.term_id,
      termName: updatedTerm.term_name,
      startDate: updatedTerm.start_date,
      endDate: updatedTerm.end_date
      }, universalAuditService.createUserContext(req));
      console.log('✅ Audit log created');
    } catch (auditError) {
      console.error('❌ Audit log failed, but continuing with update:', auditError);
      // Don't fail the entire update if audit log fails
    }

    res.json({
      success: true,
      message: 'SK Term updated successfully',
      data: {
        termId: updatedTerm.term_id,
        termName: updatedTerm.term_name,
        startDate: updatedTerm.start_date,
        endDate: updatedTerm.end_date,
        status: updatedTerm.status,
        updatedAt: updatedTerm.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating SK Term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SK Term',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete SK Term (soft delete)
 * DELETE /api/sk-terms/:id
 */
const deleteTerm = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if SK Term exists
    const existingCheck = await client.query(
      'SELECT * FROM "SK_Terms" WHERE term_id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Term not found'
      });
    }

    const term = existingCheck.rows[0];

    // Check if term has officials
    const officialsCheck = await client.query(
      'SELECT COUNT(*) as count FROM "SK_Officials" WHERE term_id = $1',
      [id]
    );

    const officialsCount = parseInt(officialsCheck.rows[0].count);

    if (officialsCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot delete term. ${officialsCount} SK officials are assigned to this term.`
      });
    }

    // Soft delete by disabling the term (schema does not allow 'deleted' status)
    const deleteQuery = `
      UPDATE "SK_Terms" 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE term_id = $1
      RETURNING *
    `;

    const result = await client.query(deleteQuery, [id]);

    await client.query('COMMIT');

    // Send notifications (fire-and-forget) - Enhanced with Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-terms', 'status', {
      termId: term.term_id,
      termName: term.term_name,
      startDate: term.start_date,
      endDate: term.end_date
    }, req.user, { oldStatus: 'active', newStatus: 'deleted' });

    // Create audit log for SK term deletion
    universalAuditService.logDeletion('sk-terms', id, {
      termId: term.term_id,
      termName: term.term_name,
      startDate: term.start_date,
      endDate: term.end_date
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'SK Term deleted successfully',
      data: {
        termId: result.rows[0].term_id,
        isActive: result.rows[0].is_active
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting SK Term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SK Term',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// === TERM STATUS MANAGEMENT ===

/**
 * Activate SK Term
 * PATCH /api/sk-terms/:id/activate
 */
const activateTerm = async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    console.log('🔧 Activating term with ID:', id);
    await client.query('BEGIN');

    // Validate term activation with comprehensive data integrity checks
    console.log('🔍 Running activation validation for term:', id);
    const validationErrors = await validateTermActivation(id, client);
    if (validationErrors.length > 0) {
      console.error('❌ Activation validation failed:', validationErrors);
      await client.query('ROLLBACK');
      
      // Create a more user-friendly error message
      const errorCount = validationErrors.length;
      let mainMessage = 'Please fix the following issues:';
      
      // Generate specific suggestions based on validation errors
      let specificSuggestions = [];
      
      // Check for specific error types and provide targeted suggestions
      if (validationErrors.some(err => err.includes('already active'))) {
        specificSuggestions.push('Complete or deactivate the current active term first');
      }
      
      if (validationErrors.some(err => err.includes('Start date is in the future'))) {
        specificSuggestions.push('Wait until the start date arrives, or update the term dates');
      }
      
      if (validationErrors.some(err => err.includes('End date has already passed'))) {
        specificSuggestions.push('The term has already ended. Create a new term instead');
      }
      
      if (validationErrors.some(err => err.includes('status is'))) {
        specificSuggestions.push('Only upcoming terms can be activated');
      }
      
      if (errorCount === 1) {
        mainMessage = validationErrors[0];
      } else if (errorCount === 2) {
        mainMessage = `${validationErrors[0]} and ${validationErrors[1].toLowerCase()}`;
      } else {
        mainMessage = `Please fix ${errorCount} activation issues`;
      }
      
      return res.status(400).json({
        success: false,
        message: mainMessage,
        errors: validationErrors,
        details: {
          termId: id,
          validationStep: 'pre-activation',
          errorCount,
          specificSuggestions,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Activate the term
    console.log('🔧 Executing activation update for term:', id);
    const updateQuery = `
      UPDATE "SK_Terms" 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE term_id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [id]);
    
    if (result.rows.length === 0) {
      console.error('❌ No rows updated during activation for term:', id);
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Term not found or could not be updated',
        details: {
          termId: id,
          operation: 'activation',
          timestamp: new Date().toISOString()
        }
      });
    }

    await client.query('COMMIT');

    // Send notifications (fire-and-forget) - Enhanced with Universal Notification Service
    universalNotificationService.sendNotificationAsync('sk-terms', 'status', {
      termId: result.rows[0].term_id,
      termName: result.rows[0].term_name,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date
    }, req.user, { oldStatus: 'inactive', newStatus: 'active' });

    // Create audit log for SK term activation
    universalAuditService.logStatusChange('sk-terms', id, 'active', {
      termId: result.rows[0].term_id,
      termName: result.rows[0].term_name,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'SK Term activated successfully',
      data: {
        termId: result.rows[0].term_id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error activating SK Term:', error);
    console.error('❌ Error details:', {
      termId: req.params.id,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to activate SK Term',
      error: error.message,
      details: {
        termId: req.params.id,
        operation: 'activation',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    client.release();
  }
};

/**
 * Get suggested term dates
 * GET /api/sk-terms/suggested-dates
 */
const getSuggestedDates = async (req, res) => {
  const client = await getClient();
  
  try {
    const suggestions = await getSuggestedTermDates(client);
    
    res.json({
      success: true,
      data: {
        suggestions,
        message: 'Suggested date ranges that don\'t conflict with existing terms'
      }
    });
  } catch (error) {
    console.error('Error getting suggested dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggested dates',
      error: error.message
    });
  } finally {
    if (client && !client.released) {
    client.release();
    }
  }
};



/**
 * Debug endpoint to check term status
 * GET /api/sk-terms/debug/status
 */
const debugTermStatus = async (req, res) => {
  const client = await getClient();
  
  try {
    console.log('🔍 Debug: Checking all terms status');
    
    // Get all terms with their status
    const allTermsQuery = `
      SELECT term_id, term_name, start_date, end_date, status, created_at, updated_at
      FROM "SK_Terms"
      ORDER BY created_at DESC
    `;
    
    const allTermsResult = await client.query(allTermsQuery);
    
    // Get active terms count
    const activeTermsQuery = `
      SELECT COUNT(*) as count
      FROM "SK_Terms"
      WHERE status = 'active'
    `;
    
    const activeTermsResult = await client.query(activeTermsQuery);
    
    // Get upcoming terms count
    const upcomingTermsQuery = `
      SELECT COUNT(*) as count
      FROM "SK_Terms"
      WHERE status = 'upcoming'
    `;
    
    const upcomingTermsResult = await client.query(upcomingTermsQuery);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      totalTerms: allTermsResult.rows.length,
      activeTermsCount: parseInt(activeTermsResult.rows[0].count),
      upcomingTermsCount: parseInt(upcomingTermsResult.rows[0].count),
      allTerms: allTermsResult.rows.map(term => ({
        termId: term.term_id,
        termName: term.term_name,
        status: term.status,
        startDate: term.start_date,
        endDate: term.end_date,
        createdAt: term.created_at,
        updatedAt: term.updated_at
      }))
    };
    
    console.log('🔍 Debug info:', debugInfo);
    
    res.json({
      success: true,
      message: 'Debug information retrieved successfully',
      data: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve debug information',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Complete SK Term
 * PATCH /api/sk-terms/:id/complete
 */
const completeTerm = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { force = false } = req.body; // Allow force completion

    console.log(`🔧 Completing term ${id} with force=${force}`);

    // Get current term details
    const termQuery = `
      SELECT term_id, term_name, status, start_date, end_date, completion_type
      FROM "SK_Terms" 
      WHERE term_id = $1
    `;
    const termResult = await client.query(termQuery, [id]);
    
    console.log(`🔍 Term query result:`, termResult.rows);
    
    // Also check if there are any terms at all
    const allTermsQuery = `SELECT term_id, term_name, status FROM "SK_Terms" LIMIT 5`;
    const allTermsResult = await client.query(allTermsQuery);
    console.log(`🔍 All terms in database:`, allTermsResult.rows);
    
    if (termResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`❌ Term ${id} not found in database`);
      return res.status(404).json({
        success: false,
        message: `SK Term with ID '${id}' not found. Available terms: ${allTermsResult.rows.map(t => t.term_id).join(', ')}`
      });
    }

    const term = termResult.rows[0];
    const today = new Date().toISOString().split('T')[0];

    // Determine completion type and validation
    let completionType = 'manual';
    let endDate = term.end_date;
    let validationErrors = [];

    if (force) {
      // Force completion: update end date to today and skip some validations
      completionType = 'forced';
      endDate = today;
      console.log(`🔧 Force completing term ${id} with end date updated to ${today}`);
    } else {
      // Normal completion: validate as usual
      console.log(`🔍 Running completion validation for term ${id}`);
      validationErrors = await validateTermCompletion(id, client);
      console.log(`🔍 Validation errors:`, validationErrors);
      
      if (validationErrors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
          message: 'Term completion validation failed',
          errors: validationErrors
      });
      }
    }

    // Mark the term as completed with enhanced audit fields
    const updateQuery = `
      UPDATE "SK_Terms" 
      SET 
        status = 'completed',
        completion_type = $1,
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $2,
        end_date = $3,
        last_status_change_at = CURRENT_TIMESTAMP,
        last_status_change_by = $2,
        status_change_reason = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE term_id = $5
      RETURNING *
    `;

    const statusChangeReason = force 
      ? 'Forced completion by admin before end date'
      : 'Manual completion by admin';

    // Get the actual user ID - ensure we have a valid user ID for audit logging
    const userId = req.user?.lydo_id || req.user?.lydoId || null;
    
    // Log the user context for debugging
    console.log('🔍 User context for audit logging:', {
      user: req.user,
      lydo_id: req.user?.lydo_id,
      lydoId: req.user?.lydoId,
      finalUserId: userId
    });
    
    const result = await client.query(updateQuery, [
      completionType,
      userId,
      endDate,
      statusChangeReason,
      id
    ]);

    // Update account access for officials in the completed term
    const accountUpdateQuery = `
      UPDATE "SK_Officials" 
      SET 
        account_access = false,
        account_access_updated_at = CURRENT_TIMESTAMP,
        account_access_updated_by = $1
      WHERE 
        term_id = $2
        AND account_access = true
      RETURNING sk_id, first_name, last_name, email
    `;

    const accountResult = await client.query(accountUpdateQuery, [
      userId,
      id
    ]);

    console.log(`🔒 Disabled account access for ${accountResult.rows.length} officials in term ${id}`);

    await client.query('COMMIT');

    // Send notifications for term completion
    const notificationData = {
      termId: result.rows[0].term_id,
      termName: result.rows[0].term_name,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date,
      completionType: completionType,
      officialsAffected: accountResult.rows.length
    };

    // Notify admin about completion (only if we have a valid user ID)
    if (userId) {
      console.log('🔔 Sending term completion notification to admin:', userId);
      console.log('🔔 User context:', req.user);
      console.log('🔔 Notification data:', notificationData);
      
      await universalNotificationService.sendNotificationAsync(
        'sk-terms',
        'status',
        {
          ...notificationData,
          // Ensure the termName and termId fields are correctly mapped
          termName: result.rows[0].term_name,
          termId: result.rows[0].term_id,
          oldStatus: 'active',
          newStatus: 'completed',
          statusChangeReason: statusChangeReason
        },
        { 
          id: userId, 
          userType: 'admin',
          firstName: req.user?.first_name || 'Admin',
          lastName: req.user?.last_name || 'User'
        },
        { 
          oldStatus: 'active',
          newStatus: 'completed',
          force, 
          officialsAffected: accountResult.rows.length 
        }
      );
      console.log('✅ Term completion notification sent to admin');
    } else {
      console.log('⚠️ No user ID available for admin notification');
    }

    // Notify affected officials about account access being disabled
    console.log(`🔔 Sending account access notifications to ${accountResult.rows.length} officials`);
    for (const official of accountResult.rows) {
      console.log(`🔔 Notifying official: ${official.sk_id} (${official.first_name} ${official.last_name})`);
      await universalNotificationService.sendNotificationAsync(
        'sk-officials',
        'status',
        {
          ...notificationData,
          // Map the fields correctly for the nameTemplate function
          firstName: official.first_name,
          lastName: official.last_name,
          position: 'SK Official', // Default position since we don't have it in the query
          skId: official.sk_id,
          officialId: official.sk_id,
          officialName: `${official.first_name} ${official.last_name}`,
          oldStatus: 'active',
          newStatus: 'inactive',
          reason: force ? 'Term force completed by admin' : 'Term completed'
        },
        { id: official.sk_id, userType: 'sk-official' },
        { 
          oldStatus: 'active',
          newStatus: 'inactive',
          force 
        }
      );
    }
    console.log('✅ Account access notifications sent to all affected officials');
    
    // Test notification to verify the system is working
    console.log('🔔 Sending test notification to verify system...');
    try {
      await universalNotificationService.sendNotificationAsync(
        'sk-terms',
        'status',
        {
      termId: result.rows[0].term_id,
      termName: result.rows[0].term_name,
          oldStatus: 'active',
          newStatus: 'completed',
          testNotification: true
        },
        { 
          id: userId, 
          userType: 'admin',
          firstName: req.user?.first_name || 'Admin',
          lastName: req.user?.last_name || 'User'
        },
        { 
          oldStatus: 'active',
          newStatus: 'completed',
          testNotification: true
        }
      );
      console.log('✅ Test notification sent successfully');
    } catch (testError) {
      console.error('❌ Test notification failed:', testError);
    }

    // Create comprehensive audit log
    await universalAuditService.logStatusChange(
      'sk-terms',
      id,
      'completed',
      {
        termName: result.rows[0].term_name,
        completionType: completionType,
        endDateUpdated: force,
        newEndDate: endDate,
        officialsAffected: accountResult.rows.length,
        reason: statusChangeReason
      },
      universalAuditService.createUserContext(req)
    );

    // Log account access changes for each official
    for (const official of accountResult.rows) {
      await universalAuditService.logStatusChange(
        'sk-officials',
        official.sk_id,
        'inactive',
        {
          reason: `Term ${force ? 'force ' : ''}completed`,
          termId: id,
          termName: result.rows[0].term_name,
          officialName: `${official.first_name} ${official.last_name}`,
          email: official.email,
          accountAccess: 'disabled'
        },
        universalAuditService.createUserContext(req)
      );
    }

    res.json({
      success: true,
      message: `SK Term ${force ? 'force ' : ''}completed successfully`,
      data: {
        termId: result.rows[0].term_id,
        termName: result.rows[0].term_name,
        status: result.rows[0].status,
        completionType: completionType,
        endDate: endDate,
        officialsAffected: accountResult.rows.length,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing SK Term:', error);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
    res.status(500).json({
      success: false,
        message: 'Failed to complete SK Term',
      error: error.message
    });
    }
  } finally {
    // Only release if client exists and hasn't been released
    if (client && !client.released) {
    client.release();
    }
  }
};

// === TERM-SPECIFIC DATA ===

/**
 * Get SK Officials for a specific term
 * GET /api/sk-terms/:id/officials
 */
const getTermOfficials = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sk.*,
        b.barangay_name
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      WHERE sk.term_id = $1
      ORDER BY sk.position, sk.last_name, sk.first_name
    `;

    const result = await query(query, [id]);

    res.json({
      success: true,
      data: {
        termId: id,
        officials: result.rows.map(official => ({
          skId: official.sk_id,
          firstName: official.first_name,
          lastName: official.last_name,
          middleName: official.middle_name,
          suffix: official.suffix,
          position: official.position,
          personalEmail: official.personal_email,
          orgEmail: official.org_email,
          status: official.status,
          barangayName: official.barangay_name,
          barangayId: official.barangay_id,
          createdAt: official.created_at,
          updatedAt: official.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching term officials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch term officials',
      error: error.message
    });
  }
};

/**
 * Get specific statistics for a term
 * GET /api/sk-terms/:id/statistics
 */
const getTermSpecificStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if term exists
    const termCheck = await query(
      'SELECT term_name FROM "SK_Terms" WHERE term_id = $1',
      [id]
    );

    if (termCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SK Term not found'
      });
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_officials,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_officials,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_officials,
        COUNT(DISTINCT barangay_id) as barangays_represented,
        COUNT(CASE WHEN position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN position = 'SK Councilor' THEN 1 END) as councilors,
        COUNT(CASE WHEN position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN position = 'SK Treasurer' THEN 1 END) as treasurers
      FROM "SK_Officials"
      WHERE term_id = $1
    `;

    const result = await query(statsQuery, [id]);
    const stats = result.rows[0];

    // Get barangay breakdown
    const barangayStatsQuery = `
      SELECT 
        b.barangay_name,
        COUNT(sk.sk_id) as official_count,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_count
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id AND sk.term_id = $1
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(sk.sk_id) > 0
      ORDER BY official_count DESC, b.barangay_name
    `;

    const barangayResult = await query(barangayStatsQuery, [id]);

    res.json({
      success: true,
      data: {
        termId: id,
        termName: termCheck.rows[0].term_name,
        overview: {
          totalOfficials: parseInt(stats.total_officials),
          activeOfficials: parseInt(stats.active_officials),
          inactiveOfficials: parseInt(stats.inactive_officials),
          barangaysRepresented: parseInt(stats.barangays_represented)
        },
        positions: {
          chairpersons: parseInt(stats.chairpersons),
          councilors: parseInt(stats.councilors),
          secretaries: parseInt(stats.secretaries),
          treasurers: parseInt(stats.treasurers)
        },
        barangayBreakdown: barangayResult.rows.map(row => ({
          barangayName: row.barangay_name,
          officialCount: parseInt(row.official_count),
          activeCount: parseInt(row.active_count)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching term statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch term statistics',
      error: error.message
    });
  }
};

/**
 * Get SK Officials for a specific term, grouped by barangay with profiling
 * GET /api/sk-terms/:id/officials-by-barangay
 */
const getTermOfficialsByBarangay = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify term exists
    const termCheck = await query(
      'SELECT term_id, term_name FROM "SK_Terms" WHERE term_id = $1',
      [id]
    );
    if (termCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'SK Term not found' });
    }

    const sql = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        sk.sk_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.email AS org_email,
        sk.personal_email,
        prof.age,
        prof.gender,
        prof.contact_number,
        prof.school_or_company
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Officials_Profiling" prof ON prof.sk_id = sk.sk_id
      WHERE sk.term_id = $1 AND sk.is_active = true
      ORDER BY b.barangay_name ASC, 
               CASE 
                 WHEN sk.position = 'SK Chairperson' THEN 1
                 WHEN sk.position = 'SK Secretary' THEN 2
                 WHEN sk.position = 'SK Treasurer' THEN 3
                 WHEN sk.position = 'SK Councilor' THEN 4
                 ELSE 5
               END,
               sk.last_name ASC, sk.first_name ASC
    `;

    const result = await query(sql, [id]);

    // Group rows by barangay
    const grouped = {};
    for (const row of result.rows) {
      const barangayId = row.barangay_id;
      if (!grouped[barangayId]) {
        grouped[barangayId] = {
          barangayId,
          barangayName: row.barangay_name,
          officials: []
        };
      }

      grouped[barangayId].officials.push({
        skId: row.sk_id,
        name: `${row.last_name?.toUpperCase() || ''}, ${row.first_name || ''}${row.middle_name ? ' ' + row.middle_name : ''}${row.suffix ? ' ' + row.suffix : ''}`.trim(),
        position: row.position,
        age: row.age || null,
        gender: row.gender || null,
        contactNumber: row.contact_number || '',
        emailAddress: row.personal_email || row.org_email || '',
        schoolOrCompany: row.school_or_company || ''
      });
    }

    const payload = Object.values(grouped);

    return res.json({
      success: true,
      data: {
        termId: id,
        termName: termCheck.rows[0].term_name,
        barangays: payload
      }
    });
  } catch (error) {
    console.error('Error fetching term officials by barangay:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch term officials by barangay',
      error: error.message
    });
  }
};

/**
 * Export Detailed Report - returns grouped data and logs activity
 * GET /api/sk-terms/:id/export-detailed
 * Query: format=csv|excel|pdf, barangayId (optional)
 */
const exportTermDetailed = async (req, res) => {
  try {
    const { id } = req.params;
    const { barangayId, format = 'json' } = req.query;

    // Reuse grouping logic
    const sql = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        sk.sk_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.email AS org_email,
        sk.personal_email,
        prof.age,
        prof.gender,
        prof.contact_number,
        prof.school_or_company
      FROM "SK_Officials" sk
      JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Officials_Profiling" prof ON prof.sk_id = sk.sk_id
      WHERE sk.term_id = $1
      ${barangayId ? 'AND b.barangay_id = $2' : ''}
      ORDER BY b.barangay_name ASC,
        CASE 
          WHEN sk.position = 'SK Chairperson' THEN 1
          WHEN sk.position = 'SK Secretary' THEN 2
          WHEN sk.position = 'SK Treasurer' THEN 3
          WHEN sk.position = 'SK Councilor' THEN 4
          ELSE 5
        END,
        sk.last_name ASC, sk.first_name ASC
    `;

    const params = barangayId ? [id, barangayId] : [id];
    const result = await query(sql, params);

    const grouped = {};
    for (const row of result.rows) {
      const bid = row.barangay_id;
      if (!grouped[bid]) {
        grouped[bid] = {
          barangayId: bid,
          barangayName: row.barangay_name,
          officials: []
        };
      }
      grouped[bid].officials.push({
        skId: row.sk_id,
        name: `${row.last_name?.toUpperCase() || ''}, ${row.first_name || ''}${row.middle_name ? ' ' + row.middle_name : ''}${row.suffix ? ' ' + row.suffix : ''}`.trim(),
        position: row.position,
        age: row.age || null,
        gender: row.gender || null,
        contactNumber: row.contact_number || '',
        emailAddress: row.personal_email || row.org_email || '',
        schoolOrCompany: row.school_or_company || ''
      });
    }

    // Write EXPORT audit log (consistent with SKManagement export)
    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.lydo_id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'EXPORT',
        resource: '/reports/term-detailed',
        resourceId: barangayId || 'bulk',
        details: `Exported ${result.rows.length} records in ${String(format || 'json').toUpperCase()} format${barangayId ? ` for barangay ${barangayId}` : ''}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (e) {
      console.error('Audit log failed for exportTermDetailed:', e);
    }

    // Fire-and-forget notification (match Overview behavior using 'creation')
    try {
      await universalNotificationService.sendNotificationAsync(
        'reports',
        'creation',
        {
          reportType: 'Term Detailed Export',
          termId: id,
          barangayId: barangayId || 'all',
          format,
          recordCount: result.rows.length
        },
        req.user
      );
    } catch (e) {
      console.error('Notification failed for exportTermDetailed:', e);
    }

    // Return JSON payload for frontend to render/convert
    return res.json({ success: true, data: { termId: id, barangays: Object.values(grouped) } });
  } catch (error) {
    console.error('Error exporting term detailed:', error);
    res.status(500).json({ success: false, message: 'Failed to export detailed report', error: error.message });
  }
};

/**
 * Extend a completed term to active status
 * PATCH /api/sk-terms/:id/extend
 */
const extendTerm = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { newEndDate, reason } = req.body;

    // Validate required fields
    if (!newEndDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'New end date is required for term extension'
      });
    }

    // Get current term details
    const termQuery = `
      SELECT term_id, term_name, status, start_date, end_date
      FROM "SK_Terms" 
      WHERE term_id = $1
    `;
    const termResult = await client.query(termQuery, [id]);
    
    if (termResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'SK Term not found'
      });
    }

    const term = termResult.rows[0];

    // Validate term can be extended (must be completed)
    if (term.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Only completed terms can be extended'
      });
    }

    // Validate new end date is in the future
    const today = new Date().toISOString().split('T')[0];
    if (newEndDate <= today) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'New end date must be in the future'
      });
    }

    // Check for active term conflicts
    const activeTermQuery = `
      SELECT term_id, term_name 
      FROM "SK_Terms" 
      WHERE status = 'active'
    `;
    const activeTermResult = await client.query(activeTermQuery);
    
    if (activeTermResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Cannot extend term: there is already an active term',
        data: {
          activeTerm: activeTermResult.rows[0]
        }
      });
    }

    // Extend the term
    const updateQuery = `
      UPDATE "SK_Terms" 
      SET 
        status = 'active',
        end_date = $1,
        completion_type = NULL,
        completed_at = NULL,
        completed_by = NULL,
        last_status_change_at = CURRENT_TIMESTAMP,
        last_status_change_by = $2,
        status_change_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE term_id = $4
      RETURNING *
    `;

    const statusChangeReason = reason || 'Term extended by admin';
    const userId = req.user?.lydo_id || null;

    const result = await client.query(updateQuery, [
      newEndDate,
      userId,
      statusChangeReason,
      id
    ]);

    // Re-enable account access for officials in the extended term
    const accountUpdateQuery = `
      UPDATE "SK_Officials" 
      SET 
        account_access = true,
        account_access_updated_at = CURRENT_TIMESTAMP,
        account_access_updated_by = $1
      WHERE 
        term_id = $2
        AND account_access = false
      RETURNING sk_id, first_name, last_name, email
    `;

    const accountResult = await client.query(accountUpdateQuery, [
      userId,
      id
    ]);

    console.log(`🔓 Re-enabled account access for ${accountResult.rows.length} officials in extended term ${id}`);

    await client.query('COMMIT');

    // Send notifications for term extension
    const notificationData = {
      termId: result.rows[0].term_id,
      termName: result.rows[0].term_name,
      startDate: result.rows[0].start_date,
      endDate: newEndDate,
      officialsAffected: accountResult.rows.length,
      reason: reason
    };

    // Notify admin about extension (only if we have a valid user ID)
    if (userId) {
      console.log('🔔 Sending term extension notification to admin:', userId);
      await universalNotificationService.sendNotificationAsync(
        'sk-terms',
        'status',
        {
          ...notificationData,
          // Ensure the termName and termId fields are correctly mapped
          termName: result.rows[0].term_name,
          termId: result.rows[0].term_id,
          oldStatus: 'completed',
          newStatus: 'active',
          statusChangeReason: statusChangeReason
        },
        { 
          id: userId, 
          userType: 'admin',
          firstName: req.user?.first_name || 'Admin',
          lastName: req.user?.last_name || 'User'
        },
        { 
          oldStatus: 'completed',
          newStatus: 'active',
          newEndDate, 
          officialsAffected: accountResult.rows.length 
        }
      );
      console.log('✅ Term extension notification sent to admin');
    } else {
      console.log('⚠️ No user ID available for admin notification');
    }

    // Notify affected officials about account access being re-enabled
    console.log(`🔔 Sending account access notifications to ${accountResult.rows.length} officials`);
    for (const official of accountResult.rows) {
      console.log(`🔔 Notifying official: ${official.sk_id} (${official.first_name} ${official.last_name})`);
      await universalNotificationService.sendNotificationAsync(
        'sk-officials',
        'status',
        {
          ...notificationData,
          // Map the fields correctly for the nameTemplate function
          firstName: official.first_name,
          lastName: official.last_name,
          position: 'SK Official', // Default position since we don't have it in the query
          skId: official.sk_id,
          officialId: official.sk_id,
          officialName: `${official.first_name} ${official.last_name}`,
          oldStatus: 'inactive',
          newStatus: 'active',
          reason: 'Term extended by admin'
        },
        { id: official.sk_id, userType: 'sk-official' },
        { 
          oldStatus: 'inactive',
          newStatus: 'active',
          newEndDate 
        }
      );
    }
    console.log('✅ Account access notifications sent to all affected officials');

    // Create comprehensive audit log
    await universalAuditService.logStatusChange(
      'sk-terms',
      id,
      'active',
      {
        termName: result.rows[0].term_name,
        oldEndDate: term.end_date,
        newEndDate: newEndDate,
        officialsAffected: accountResult.rows.length,
        reason: statusChangeReason
      },
      universalAuditService.createUserContext(req)
    );

    // Log account access changes for each official
    for (const official of accountResult.rows) {
      await universalAuditService.logStatusChange(
        'sk-officials',
        official.sk_id,
        'active',
        {
          reason: 'Term extended',
          termId: id,
          termName: result.rows[0].term_name,
          officialName: `${official.first_name} ${official.last_name}`,
          email: official.email,
          accountAccess: 'enabled'
        },
        universalAuditService.createUserContext(req)
      );
    }

    res.json({
      success: true,
      message: 'SK Term extended successfully',
      data: {
        termId: result.rows[0].term_id,
        termName: result.rows[0].term_name,
        status: result.rows[0].status,
        newEndDate: newEndDate,
        officialsAffected: accountResult.rows.length,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error extending SK Term:', error);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to extend SK Term',
        error: error.message
      });
    }
  } finally {
    // Only release if client exists and hasn't been released
    if (client && !client.released) {
      client.release();
    }
  }
};

export default {
  // List & Search
  getAllTerms,
  getActiveTerm,
  getTermHistory,
  getTermStatistics,
  
  // Individual Operations
  getTermById,
  createTerm,
  updateTerm,
  deleteTerm,
  
  // Status Management
  activateTerm,
  completeTerm,
  extendTerm,
  
  // Debug
  debugTermStatus,
  getSuggestedDates,
  
  // Term-specific Data
  getTermOfficials,
  getTermSpecificStats
  ,
  getTermOfficialsByBarangay,
  exportTermDetailed
};
