import { query, getClient } from '../config/database.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

/**
 * Survey Submission Controller
 * Handles public token-based access to survey submissions
 */

/**
 * Get survey submission by token (public endpoint)
 * GET /api/survey-submissions/by-token/:token
 */
export const getSubmissionByToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = TokenGenerator.hashToken(token);

    // First, check if token exists (even if expired) without filtering anonymized profiles
    const tokenCheckResult = await query(
      `SELECT 
        sr.response_id,
        sr.access_token_expires_at,
        sr.youth_id
       FROM "KK_Survey_Responses" sr
       WHERE sr.access_token_hash = $1`,
      [tokenHash]
    );

    // If token doesn't exist at all
    if (tokenCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid access link. Please use the link from your email.',
        errorType: 'invalid_token'
      });
    }

    // Check if token is expired
    const tokenData = tokenCheckResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.access_token_expires_at);
    
    if (expiresAt < now) {
      return res.status(404).json({
        success: false,
        message: 'This link has expired. Please request a new link.',
        errorType: 'expired_token',
        youthId: tokenData.youth_id
      });
    }

    // Get submission with token hash (token is valid)
    // Note: region, province, municipality are in Youth_Profiling table, not Barangay table
    const result = await query(
      `SELECT 
        sr.*,
        sr.youth_id,
        sr.validation_comments,
        sr.validated_by,
        sr.validation_date,
        yp.first_name,
        yp.last_name,
        yp.middle_name,
        yp.suffix,
        yp.email,
        yp.contact_number,
        yp.age,
        yp.gender,
        yp.birth_date,
        yp.purok_zone,
        yp.region as region_name,
        yp.province as province_name,
        yp.municipality as municipality_name,
        b.barangay_name,
        kb.batch_name,
        kb.description as batch_description,
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
          sr.validated_by
        ) as validator_name
       FROM "KK_Survey_Responses" sr
       LEFT JOIN "Youth_Profiling" yp ON sr.youth_id = yp.youth_id
       LEFT JOIN "Barangay" b ON yp.barangay_id = b.barangay_id
       LEFT JOIN "KK_Survey_Batches" kb ON sr.batch_id = kb.batch_id
       LEFT JOIN "LYDO" lydo ON sr.validated_by = lydo.lydo_id
       LEFT JOIN "SK_Officials" sk ON sr.validated_by = sk.sk_id
       WHERE sr.access_token_hash = $1
         AND sr.access_token_expires_at > CURRENT_TIMESTAMP
         AND yp.anonymized_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      // Check if profile exists but is anonymized
      const anonCheck = await query(
        `SELECT yp.anonymized_at
         FROM "KK_Survey_Responses" sr
         LEFT JOIN "Youth_Profiling" yp ON sr.youth_id = yp.youth_id
         WHERE sr.access_token_hash = $1`,
        [tokenHash]
      );
      const anonymized = anonCheck.rows[0]?.anonymized_at ? true : false;
      return res.status(404).json({
        success: false,
        message: anonymized
          ? 'This submission is no longer available.'
          : 'Submission not found. Please contact support.',
        errorType: anonymized ? 'anonymized_profile' : 'not_found'
      });
    }

    const submission = result.rows[0];

    // Remove sensitive token data from response
    delete submission.access_token_hash;

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    logger.error('Get submission by token error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get survey submission',
      error: error.message,
      errorType: 'server_error'
    });
  }
};

/**
 * Resend email with new token (public endpoint)
 * POST /api/survey-submissions/resend-email
 */
export const resendEmail = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { youth_id, email } = req.body;

    if (!youth_id || !email) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Youth ID and email are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Get the most recent survey response for this youth
    const submissionResult = await client.query(
      `SELECT 
        sr.response_id,
        sr.youth_id,
        sr.batch_id,
        sr.created_at,
        yp.first_name,
        yp.middle_name,
        yp.last_name,
        yp.suffix,
        yp.email as profile_email,
        kb.batch_name
       FROM "KK_Survey_Responses" sr
       LEFT JOIN "Youth_Profiling" yp ON sr.youth_id = yp.youth_id
       LEFT JOIN "KK_Survey_Batches" kb ON sr.batch_id = kb.batch_id
       WHERE sr.youth_id = $1
         AND yp.anonymized_at IS NULL
       ORDER BY sr.created_at DESC
       LIMIT 1`,
      [youth_id]
    );

    if (submissionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No survey submission found for this Youth ID',
      });
    }

    const submission = submissionResult.rows[0];

    // Verify email matches (case-insensitive)
    if (submission.profile_email && submission.profile_email.toLowerCase() !== email.toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Email does not match the email on file for this Youth ID',
      });
    }

    // Generate new token
    const tokenData = TokenGenerator.generateTokenWithExpiration(72);
    const tokenHash = TokenGenerator.hashToken(tokenData.token);

    // Update token in database
    await client.query(
      `UPDATE "KK_Survey_Responses"
       SET access_token_hash = $1,
           access_token_expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE response_id = $3`,
      [tokenHash, tokenData.expiresAt, submission.response_id]
    );

    await client.query('COMMIT');

    // Send email with new token (async, don't block response)
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/survey-submission/status?token=${tokenData.token}`;

    // Determine which email template to use based on validation status
    const statusResult = await query(
      `SELECT validation_status FROM "KK_Survey_Responses" WHERE response_id = $1`,
      [submission.response_id]
    );
    const validationStatus = statusResult.rows[0]?.validation_status || 'pending';

    // Use appropriate template based on validation status
    // Check if surveyPending template exists, otherwise use surveyValidated
    const templateName = validationStatus === 'validated' 
      ? 'surveyValidated' 
      : validationStatus === 'rejected' 
      ? 'surveyRejected' 
      : 'surveyPending'; // Use surveyPending for pending status if available

    // Construct full name including middle name and suffix
    const firstName = submission.first_name || '';
    const middleName = submission.middle_name || '';
    const lastName = submission.last_name || '';
    const suffix = submission.suffix || '';
    const fullName = firstName && lastName
      ? `${firstName}${middleName ? ' ' + middleName : ''}${lastName ? ' ' + lastName : ''}${suffix ? ' ' + suffix : ''}`.trim()
      : firstName || '-';
    
    // Build email data based on template requirements
    let emailData;
    if (validationStatus === 'validated') {
      emailData = {
        userName: fullName,
        email: submission.profile_email || email || null,
        batchName: submission.batch_name || 'Youth Survey',
        validationDate: new Date().toISOString(),
        trackingUrl: trackingUrl,
        responseId: submission.response_id,
        youthId: submission.youth_id,
        submittedAt: submission.created_at ? new Date(submission.created_at).toISOString() : new Date().toISOString(),
        frontendUrl: baseUrl,
      };
    } else if (validationStatus === 'rejected') {
      emailData = {
        userName: fullName,
        email: submission.profile_email || email || null,
        batchName: submission.batch_name || 'Youth Survey',
        validationDate: new Date().toISOString(),
        trackingUrl: trackingUrl,
        responseId: submission.response_id,
        youthId: submission.youth_id,
        submittedAt: submission.created_at ? new Date(submission.created_at).toISOString() : new Date().toISOString(),
        frontendUrl: baseUrl,
      };
    } else {
      // pending status
      emailData = {
        userName: fullName,
        email: submission.profile_email || email || null,
        batchName: submission.batch_name || 'Youth Survey',
        submissionDate: submission.created_at ? new Date(submission.created_at).toISOString() : new Date().toISOString(),
        trackingUrl: trackingUrl,
        responseId: submission.response_id,
        youthId: submission.youth_id,
        submittedAt: submission.created_at ? new Date(submission.created_at).toISOString() : new Date().toISOString(),
        frontendUrl: baseUrl,
      };
    }

    // Send email asynchronously
    Promise.resolve().then(async () => {
      try {
        await emailService.sendTemplatedEmail(
          templateName,
          emailData,
          email.trim()
        );
        logger.info(`Resent ${templateName} email`, { email: email.trim() });
      } catch (emailError) {
        logger.error('Failed to resend email', { error: emailError.message, stack: emailError.stack, email: email.trim() });
      }
    });

    res.json({
      success: true,
      message: 'New access link has been sent to your email',
      data: {
        email: email.trim(),
        youthId: youth_id
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Resend email error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to resend email',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

