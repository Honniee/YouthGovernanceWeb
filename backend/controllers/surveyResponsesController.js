import db from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Create or update a survey response (auto-save functionality)
 */
const saveSurveyResponse = async (req, res) => {
  try {
    const {
      batch_id,
      youth_id,
      user_id,
      response_data,
      status = 'in_progress'
    } = req.body;

    // Validate required fields
    if (!batch_id || !youth_id || !user_id || !response_data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: batch_id, youth_id, user_id, response_data'
      });
    }

    // Check if response already exists
    const existingResponse = await db.query(`
      SELECT response_id FROM "KK_Survey_Responses" 
      WHERE batch_id = $1 AND youth_id = $2
    `, [batch_id, youth_id]);

    let response_id;
    let result;

    if (existingResponse.rows.length > 0) {
      // Update existing response
      response_id = existingResponse.rows[0].response_id;
      
      result = await db.query(`
        UPDATE "KK_Survey_Responses" 
        SET 
          response_data = $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP,
          submitted_at = CASE 
            WHEN $2 = 'submitted' AND submitted_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE submitted_at 
          END
        WHERE response_id = $3
        RETURNING *
      `, [JSON.stringify(response_data), status, response_id]);

    } else {
      // Create new response
      response_id = generateId('RES', 'KK_Survey_Responses', 'response_id');
      
      result = await db.query(`
        INSERT INTO "KK_Survey_Responses" (
          response_id, batch_id, youth_id, user_id, response_data, status,
          submitted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          CASE WHEN $6 = 'submitted' THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        RETURNING *
      `, [
        response_id, batch_id, youth_id, user_id, 
        JSON.stringify(response_data), status
      ]);
    }

    return res.status(200).json({
      success: true,
      message: 'Survey response saved successfully',
      response_id: response_id,
      response: {
        ...result.rows[0],
        response_data: typeof result.rows[0].response_data === 'string' 
          ? JSON.parse(result.rows[0].response_data) 
          : result.rows[0].response_data
      }
    });

  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while saving survey response'
    });
  }
};

/**
 * Retrieve existing survey response for auto-save restoration
 */
const getSurveyResponse = async (req, res) => {
  try {
    const { batch_id, youth_id } = req.query;

    if (!batch_id || !youth_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: batch_id and youth_id'
      });
    }

    const query = `
      SELECT 
        sr.*,
        yp.first_name,
        yp.last_name,
        yp.email,
        kb.batch_name
      FROM "KK_Survey_Responses" sr
      LEFT JOIN "Youth_Profiling" yp ON sr.youth_id = yp.youth_id
      LEFT JOIN "KK_Survey_Batches" kb ON sr.batch_id = kb.batch_id
      WHERE sr.batch_id = $1 AND sr.youth_id = $2
    `;

    const result = await db.query(query, [batch_id, youth_id]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: 'No existing survey response found'
      });
    }

    const response = result.rows[0];

    return res.status(200).json({
      success: true,
      exists: true,
      response_id: response.response_id,
      youth_id: response.youth_id,
      user_id: response.user_id,
      batch_id: response.batch_id,
      batch_name: response.batch_name,
      response_data: typeof response.response_data === 'string' 
        ? JSON.parse(response.response_data) 
        : response.response_data,
      status: response.status,
      created_at: response.created_at,
      updated_at: response.updated_at,
      submitted_at: response.submitted_at,
      youth_info: {
        first_name: response.first_name,
        last_name: response.last_name,
        email: response.email
      }
    });

  } catch (error) {
    console.error('Error retrieving survey response:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving survey response'
    });
  }
};

/**
 * Submit final survey response
 */
const submitSurveyResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const { response_data } = req.body;

    if (!response_data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: response_data'
      });
    }

    // Update response with final submission
    const result = await db.query(`
      UPDATE "KK_Survey_Responses" 
      SET 
        response_data = $1,
        status = 'submitted',
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE response_id = $2
      RETURNING *
    `, [JSON.stringify(response_data), response_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey response not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Survey response submitted successfully',
      response: {
        ...result.rows[0],
        response_data: typeof result.rows[0].response_data === 'string' 
          ? JSON.parse(result.rows[0].response_data) 
          : result.rows[0].response_data
      }
    });

  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting survey response'
    });
  }
};

/**
 * Check if user has already submitted a response for this batch
 */
const checkSubmissionStatus = async (req, res) => {
  try {
    const { batch_id, youth_id } = req.query;

    if (!batch_id || !youth_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: batch_id and youth_id'
      });
    }

    const query = `
      SELECT 
        response_id,
        status,
        submitted_at,
        created_at,
        updated_at
      FROM "KK_Survey_Responses" 
      WHERE batch_id = $1 AND youth_id = $2
    `;

    const result = await db.query(query, [batch_id, youth_id]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        has_response: false,
        message: 'No survey response found for this user and batch'
      });
    }

    const response = result.rows[0];

    return res.status(200).json({
      success: true,
      has_response: true,
      response_id: response.response_id,
      status: response.status,
      is_submitted: response.status === 'submitted',
      submitted_at: response.submitted_at,
      created_at: response.created_at,
      updated_at: response.updated_at
    });

  } catch (error) {
    console.error('Error checking submission status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while checking submission status'
    });
  }
};

/**
 * Get survey response statistics for a batch
 */
const getBatchResponseStats = async (req, res) => {
  try {
    const { batch_id } = req.params;

    const query = `
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_responses,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_responses,
        kb.batch_name,
        kb.target_age_min,
        kb.target_age_max
      FROM "KK_Survey_Responses" sr
      LEFT JOIN "KK_Survey_Batches" kb ON sr.batch_id = kb.batch_id
      WHERE sr.batch_id = $1
      GROUP BY kb.batch_id, kb.batch_name, kb.target_age_min, kb.target_age_max
    `;

    const result = await db.query(query, [batch_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    const stats = result.rows[0];

    return res.status(200).json({
      success: true,
      batch_id: batch_id,
      batch_name: stats.batch_name,
      target_age_min: stats.target_age_min,
      target_age_max: stats.target_age_max,
      statistics: {
        total_responses: parseInt(stats.total_responses),
        submitted_responses: parseInt(stats.submitted_responses),
        in_progress_responses: parseInt(stats.in_progress_responses),
        completion_rate: stats.total_responses > 0 
          ? Math.round((stats.submitted_responses / stats.total_responses) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Error getting batch response stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting batch response statistics'
    });
  }
};

export {
  saveSurveyResponse,
  getSurveyResponse,
  submitSurveyResponse,
  checkSubmissionStatus,
  getBatchResponseStats
};
